# Controlled QEMU Args Sync v1

## 背景

`Sanaka` 当前的高级参数能力主要是：

- UI 生成一套 QEMU 参数
- 用户在 `advanced.qemu_args` 中手工追加一段尾部文本

这条路线有一个根本问题：

- 它把高级参数当作“命令末尾补丁”
- 但很多 QEMU 参数并不是可以随便尾部追加的独立项
- 它们往往需要并入已有参数结构中

例如：

- `hostfwd=...` 必须挂在 `-netdev user,...` 或 `-nic user,...` 上
- 某些 `-device`、`-drive`、`-machine`、`-audiodev` 也都存在结构化关系

这使得继续增强“尾部补丁字符串”会越来越脆弱。

因此 `v1` 要调整思路：

- 不再把“高级参数”理解成一个纯尾部拼接口
- 而是把它升级为一个**完整参数列表视图**
- 对于 UI 已建模的参数，允许和 UI 字段做双向同步
- 对于 UI 未建模的参数，不新增 UI 字段，只保留在高级参数层

## 目标

`v1` 目标是建立一套稳定的参数同步规则：

1. `Sanaka` 实时生成完整的 QEMU 参数列表
2. 参数列表按行显示
3. UI 已有字段对应的参数行为“受控参数行（controlled args）”
4. 受控参数行与 UI 双向同步
5. UI 没有对应字段的参数行为“自定义参数行（custom args）”
6. 自定义参数行不会反向生成新的 UI 字段

## 核心原则

### 1. 只有 UI 已建模参数才允许双向同步

这是这份 spec 最关键的原则。

如果某个参数在当前 `Sanaka` UI 中已经有明确字段或结构，那么它属于：

- `controlled args`

这类参数应满足：

- UI 字段变化时，参数行实时变化
- 参数行变化时，UI 字段也实时变化

例如：

- 内存
- CPU 核心数
- 加速器
- 启动顺序
- 网络模式
- 网卡型号
- 显卡
- 声卡
- ISO / floppy
- 磁盘列表
- USB tablet

### 2. UI 没有的参数不反推 UI

如果某个参数当前 UI 没有对应字段，那么它属于：

- `custom args`

这类参数：

- 不反推到 UI
- 不新增额外 UI 字段
- 只存在于高级参数列表层

例如：

- 某些 `-global`
- 某些实验性 `-device`
- 某些临时调试参数
- 某些特定 block / chardev / serial 配置

### 3. 不允许同义参数同时在 controlled 和 custom 两层重复存在

如果某个语义已经属于 `controlled args`，那么它不允许再在 `custom args` 中另起一份同义参数。

也就是说：

- `-m 2048` 属于 UI 已知参数
- 那么它应只存在于 controlled 层
- 不允许 UI 内存是 `2048`，同时 custom args 再挂一个 `-m 4096`

否则系统会出现双真相源。

## 用户交互规则

## 1. UI 改 controlled，参数列表同步更新

例如：

- UI 内存从 `2048` 改为 `4096`

那么：

- 参数列表中的 `-m 2048` 应实时变为 `-m 4096`

## 2. 参数列表改 controlled，UI 也同步更新

例如：

- 参数列表中的 `-m 2048` 改为 `-m 4096`

那么：

- UI 中的内存字段也应实时变为 `4096`

这条规则适用于：

- 所有 UI 已知参数

## 3. custom args 不生成新的 UI 控件

例如用户在高级参数中新增：

- `-global ICH9-LPC.disable_s3=1`

则：

- 该参数保留在 custom args 中
- UI 不会因此长出一个“禁用 S3”开关

## 参数模型

`v1` 将完整参数列表拆成两类：

### A. Controlled Args

字段建议包括：

- `id`
- `bindingKey`
- `label`
- `raw`
- `editable`
- `source = "controlled"`

其中：

- `bindingKey` 表示这个参数绑定哪个 UI 字段
- `raw` 表示当前参数行文本

例如：

- `bindingKey = "system.memory_mib"`
- `raw = "-m 4096"`

### B. Custom Args

字段建议包括：

- `id`
- `raw`
- `editable`
- `source = "custom"`

custom args 不要求有 `bindingKey`。

## 参数列表 UI 规则

### 1. 按行显示

高级参数区不再是一个大文本框。

改为：

- 一行一个参数项
- 每行可单独编辑
- 支持 `+`
- 支持 `-`

### 2. 行级来源可区分

建议在视觉或数据模型上区分：

- `controlled`
- `custom`

这样用户能知道：

- 哪些行会影响 UI
- 哪些行只是附加参数

### 3. Controlled 行默认允许编辑

但编辑后应走受控回写，而不是简单字符串替换。

例如用户编辑：

- `-m 4096`

系统不应只改一行文本，而应回写：

- `machine.system.memory_mib = 4096`

然后再重新生成该行。

### 4. Custom 行自由增删改

custom args 行支持：

- 新增
- 删除
- 编辑

但它们只更新 custom args 层，不要求回写 UI。

## 同步规则

### 1. UI -> Args

当 UI 变更时：

- 受影响的 controlled args 重新生成
- custom args 保持原状
- 最终命令重新合并

### 2. Controlled Args -> UI

当用户编辑 controlled args 时：

- 系统先根据 `bindingKey` 解析并更新 machine draft
- 再重新生成 controlled args

这意味着：

- controlled args 的文本不是最终真相源
- machine draft 才是受控参数的真相源

### 3. Custom Args -> Final Command

当用户编辑 custom args 时：

- 只更新 custom args 列表
- 不改变 UI 字段
- 不创建新的 UI 字段

## 数据持久化建议

当前建议将高级参数存储拆分为两层语义：

### 1. Controlled

不单独存文本，直接来源于 machine 结构字段。

### 2. Custom

继续存储为高级参数附加层。

建议后续把现在单一的：

- `advanced.qemu_args`

演进为更清晰的结构，例如：

```toml
[advanced]
audio_backend = "auto"

[[advanced.custom_args]]
raw = "-global ICH9-LPC.disable_s3=1"
```

但 `v1` 允许先兼容当前字符串存储形式，只要后端能提供结构化读写接口即可。

## 冲突处理

### 1. controlled 同义参数进入 custom 时

如果用户试图在 custom args 中新增一个当前 UI 已知的同义参数，例如：

- `-m 4096`

则系统不应默默接受为普通 custom 行。

建议处理方式：

- 识别为 controlled 语义
- 回写到对应 UI 字段
- 不在 custom 中重复保留

### 2. 无法识别的行

如果用户输入的参数行无法映射到 controlled 规则，就保留为 custom args。

### 3. 无效 controlled 编辑

例如把：

- `-m abc`

写进受控行

则应阻止提交并提示格式错误，而不是把无效内容写回 machine。

## v1 范围

`v1` 不要求一次性覆盖所有 UI 参数。

但至少应优先覆盖最核心、最常用、最稳定的受控参数：

1. 内存 `-m`
2. CPU `-smp`
3. 加速器 `-accel`
4. 启动顺序 `-boot`
5. 网络模式相关核心行
6. 网卡型号核心行
7. 端口转发（如果已经正式建模）

其他项可以分批接入。

## 非目标

这次不做：

- 任意 QEMU 参数的完整通用反向解析器
- 根据 custom args 自动生成全新 UI 控件
- 让所有复杂 `-device` / `-drive` / `-blockdev` 都立即双向同步
- 用“智能猜测”覆盖所有高级参数场景

## 验收标准

完成后至少满足：

1. 高级参数区不再只是单一大文本框语义
2. 参数按行展示
3. UI 已知参数能双向同步
4. UI 未知参数不新增 UI 字段
5. 不允许 controlled 与 custom 同义重复
6. 修改 UI 时参数列表实时更新
7. 修改 controlled 行时 UI 也实时更新
8. custom 行支持增删改

## 后续方向

`v2` 可以继续增加：

- 更多 controlled bindings
- 参数来源高亮
- 冲突提示 UI
- 自定义参数分组
- 更清晰的命令预览与复制能力
