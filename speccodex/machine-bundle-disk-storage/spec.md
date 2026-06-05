# Sanaka 机器包内磁盘存储与导入外部引用 Spec

## 背景

当前磁盘行为有两个根问题：

1. 新建磁盘时，前端会先写一个临时文件名或外部路径进 `machine.svm`，但这个文件并不一定真实存在于机器包内。
2. 导入磁盘时，当前实现既没有稳定记录“这是外部磁盘”的语义，也没有在保存和运行阶段把路径处理好，导致容易出现坏路径。

你截图里的报错本质上就是这个问题：

- `machine.svm` 里记录了一个运行时找不到的磁盘路径。
- Runtime 按配置直接把这个路径交给 QEMU。
- QEMU 返回 `No such file or directory`。

Sanaka 已经把“机器包”定义为一台虚拟机的主对象，但这不等于所有磁盘都必须立即复制进包里。更合理的做法是：

- Sanaka 创建的新磁盘，由机器包自己管理
- 用户已有的大磁盘，默认作为外部资源引用
- 当用户需要搬迁、备份、分享时，再明确执行“整理到虚拟机”

## 目标

目标行为固定为：

- 默认创建的新磁盘镜像，真实文件必须位于机器包内部。
- 导入已有镜像时，默认作为外部磁盘引用，而不是立即复制一份进机器包。
- Runtime 必须明确区分“包内受管磁盘”和“外部引用磁盘”。
- 无论 macOS、Windows、Linux，都不能再出现“保存后路径丢失、启动时找不到盘”的现象。

## 非目标

- 本 spec 不重做磁盘管理界面视觉。
- 本 spec 不引入快照系统。
- 本 spec 不讨论镜像压缩、回收无用空间的具体 UI。
- 本 spec 不要求第一轮就完成所有旧配置自动迁移，但必须给出兼容规则。

## 核心原则

### 1. 机器包必须拥有自己的磁盘目录

每个机器包固定新增：

```text
<Machine>.saka/ 或 <Machine>/
  machine.svm
  preview.png
  Disks/
```

`Disks/` 是机器包内部唯一正式受管磁盘目录。

规则：

- 新建磁盘默认写入 `Disks/`
- 导入磁盘不默认复制到 `Disks/`
- Runtime 启动时既要能解析 `Disks/` 下的受管磁盘，也要能解析外部引用磁盘
- UI 显示“磁盘已加入当前虚拟机”，而不是暴露外部路径心智

### 2. `machine.svm` 中的磁盘路径必须有明确语义

`[[disks]].path` 不能再是“有时是包内相对路径，有时是裸文件名，有时是外部绝对路径，但没有说明”。

固定规则：

- 受管磁盘使用 bundle-relative 路径，例如 `Disks/system.qcow2`
- 外部磁盘使用绝对路径
- 每块磁盘都必须带 `storage_mode`
- Runtime 读取 `machine.svm` 后，先按 `storage_mode` 决定如何解析路径，再构建 QEMU 参数
- 不允许把裸文件名如 `czadb.qcow2` 直接交给 QEMU`

不允许把“仅存在于草稿 UI 中”的临时名字当作真实运行路径。

## 数据模型调整

建议把 `[[disks]]` 扩成下面这类结构：

```toml
[[disks]]
id = "disk0"
path = "Disks/system.qcow2"
format = "qcow2"
interface = "virtio"
boot = true
readonly = false
storage_mode = "managed"
source_path = ""
```

字段含义：

- `path`
  - `managed` 时是机器包内相对路径
  - `external` 时是外部绝对路径
- `format`
  - 明确磁盘格式，避免 Runtime 继续硬编码 `qcow2`
- `storage_mode`
  - `managed`
  - `external`
- `source_path`
  - 仅对受管磁盘可选保留原始来源，供未来“整理到虚拟机”或诊断使用

语义上：

- Runtime 只依赖 `path` 和 `format`
- UI 可选展示 `storage_mode`
- `source_path` 只作管理信息，不作为运行入口

## 创建新磁盘规则

### 1. 保存位置

新建磁盘镜像时：

- 默认目录固定为当前机器包内的 `Disks/`
- 默认文件名优先使用磁盘名称清洗后生成
- 若重名，自动追加序号，例如：
  - `system.qcow2`
  - `system 2.qcow2`
  - `system 3.qcow2`

### 2. 草稿阶段

如果当前机器还只是未落盘草稿，没有真实机器包目录：

- 不直接在随机当前工作目录创建镜像
- 不直接写相对裸文件名进 `machine.svm`
- 前端只记录“待创建磁盘意图”
- 真正创建机器时，先落机器包，再在 `<bundle>/Disks/` 中实际创建镜像

这条规则是为了避免“磁盘先创建在错误目录，之后机器另存到别处”的路径失真。

### 3. 已保存机器编辑

如果当前机器已经有真实包路径：

- 直接在该机器包的 `Disks/` 下创建镜像
- 立即更新 `machine.svm`

## 导入磁盘规则

### 1. 产品语义

“导入磁盘”在第一版默认就是“把一个已有磁盘挂到这台虚拟机上”。

导入后的正式行为应是：

- `machine.svm` 明确记录这是 `external` 磁盘
- Runtime 直接使用该外部绝对路径
- 保存和启动前都做存在性检查
- 用户后续如果需要可搬迁性，再执行“整理到虚拟机”

这比“默认复制一份”更符合跨平台桌面产品的现实：

- 导入快
- 不突然再占一份几十 GB 的空间
- 不依赖各平台文件链接能力
- 行为在 macOS、Windows、Linux 上更一致

### 4. UI 语义

普通用户文案继续保持用户向：

- “已导入到当前虚拟机”
- “使用外部磁盘”
- “已整理到当前虚拟机”

不要把 `.svm`、相对路径、内部路径解析这类内部术语放到主流程文案里。

### 3. 整理到虚拟机

如果用户需要：

- 把整台虚拟机复制到别的机器
- 做完整备份
- 发给别人

则可以执行“整理到虚拟机”：

1. 把外部磁盘复制到 `<bundle>/Disks/`
2. 自动重名避让
3. 更新 `storage_mode = "managed"`
4. 把 `path` 改写为 bundle-relative 路径
5. 可选记录 `source_path`

这一动作是明确的、可预期的，不在普通导入时偷偷发生。

## 可移植性结论

如果你的目标是“把整个虚拟机包复制到另一台机器后也基本没事”，答案要分两种情况：

### 1. 创建型磁盘

是。

因为镜像真实文件就在机器包的 `Disks/` 里，机器包本身就是自洽的。

### 2. 导入后已整理到虚拟机

也是。

因为目标磁盘已经被真正复制进机器包，复制整个机器包时不会再依赖原始来源。

### 3. 导入后仍是外部引用

不一定。

因为机器包仍依赖包外原始磁盘。你把机器包单独复制到别的机器时，外部盘通常不会一起过去。

## 产品取舍建议

从主流产品的共同做法看：

- 新建磁盘通常默认放在虚拟机自己的目录或 bundle 中
- 已有磁盘通常允许直接引用
- 是否复制进虚拟机，应作为显式动作或按磁盘类型区分，而不是偷偷做

结论很直接：

- `managed` / 包内创建 = 最稳，可复制到其他机器
- `external` = 快、省空间，但不能保证你说的“copy 到其他机器都没事”

## Runtime 规则

Runtime 层必须改成：

1. 先拿到 `bundlePath`
2. 读取 `machine.svm`
3. 把 `disk.path` 作为 bundle-relative 路径解析
4. 得到绝对路径后再拼接 QEMU `-drive`

固定规则：

- Runtime 不直接信任裸相对路径
- Runtime 不默认把路径解释为当前进程工作目录
- Runtime 构建命令前必须校验磁盘入口是否存在
- 如果入口不存在，报错应明确指出：
  - 哪个磁盘入口缺失
  - 该入口属于当前机器包

## 兼容规则

### 1. 旧配置读取

当前旧机器里可能存在：

- 外部绝对路径
- 裸文件名
- 非 `Disks/` 路径

兼容策略：

- 读取时允许解析旧配置
- 如果发现磁盘路径不是 bundle-relative 的正式路径，标记为 legacy disk reference
- 用户下一次保存该机器时，触发迁移：
  - 如果原盘仍存在，按导入规则搬成 link / hard link / copy
  - 然后把 `machine.svm` 改写为新规则

### 2. 启动前保护

如果机器仍携带旧式坏路径：

- 启动前先做路径检查
- 若路径缺失，给出明确用户向错误
- 不允许静默把错误拖到 QEMU 才暴露

## API 建议

需要新增或收紧这些后端语义：

- `electronAPI.disks.createForMachineBundle(request)`
  - 输入机器包路径、磁盘名称、大小、格式
  - 输出机器包内真实磁盘入口

- `electronAPI.disks.importIntoMachineBundle(request)`
  - 输入机器包路径、来源镜像路径
  - 输出：
    - `path`
    - `storageMode`
    - `linkKind`
    - `originPath`

- `electronAPI.disks.resolveBundleDiskPath(bundlePath, diskPath)`
  - 统一把 bundle-relative 路径解成绝对路径

- `electronAPI.disks.preparePendingDisksForBundle(request)`
  - 在机器首次创建时，把草稿阶段的磁盘意图真正落到 `Disks/`

## 验收标准

- 新建磁盘后，真实镜像文件出现在当前机器包的 `Disks/` 中。
- 导入磁盘后，`machine.svm` 不再直接引用外部原始路径作为运行入口。
- 机器包移动位置后，包内创建型磁盘仍可正常启动。
- macOS / Linux 导入磁盘默认创建 file symlink。
- Windows 导入磁盘优先尝试 file symlink，失败后退到 hard link，再失败才复制。
- Runtime 启动前能把 `Disks/...` 正确解析成绝对路径。
- 不再出现裸文件名被直接传给 QEMU 导致 `No such file or directory`。

## 风险与取舍

### 1. Windows symlink 权限

Windows 上 file symlink 可能因权限或 Developer Mode 未开启而失败。

因此产品不能把“symlink 一定成功”当假设。

### 2. Hard link 的限制

hard link 不是跨卷方案，也不能指向目录。

但对“导入单个磁盘文件”这个场景，它是比“直接外链”更安全的第二选择。

### 3. Copy 的空间成本

copy 会占额外空间。

但它优于继续保留外部绝对路径依赖，因为后者会让机器包不可移植，也更容易在启动时炸掉。

## 结论

Sanaka 后续应把“创建型磁盘属于机器包”作为硬规则，把“导入型磁盘默认外部引用”作为第一版主线。

真正需要固定的是：

- 新建盘进 `Disks/`
- 导入盘默认 `external`
- Runtime 按 `storage_mode` 解析路径
- 需要可搬运性时，再执行“整理到虚拟机”

只要这四条落下去，你截图里这种错误基本就会从根上消失。
