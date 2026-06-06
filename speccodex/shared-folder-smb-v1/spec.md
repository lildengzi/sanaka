# Sanaka 共享文件夹 SMB v1 Spec

## 背景

用户希望在 Sanaka 控制台右侧状态栏增加一个“共享文件夹”按钮，提供一个真正好用的宿主机 / 客户机共享目录。

目标要求是：

- 宿主机和客户机都可读写
- 双方同时读写时尽量正常
- 客户机不需要额外安装虚拟机驱动
- 不受虚拟磁盘容量限制
- 可以随时切换共享目录

这几个条件放在一起后，第一版最现实的路线不是 `virtiofs`，也不是 `9p`，而是：

- `QEMU user networking + SMB shared folder`

原因很直接：

- `virtiofs` 在 Windows 客户机上需要额外驱动/服务，不符合“无驱动”目标
- `9p` 也依赖客户机侧支持和手动挂载，不适合用户向主路径
- SMB 客户端在 Windows / macOS / Linux 客户机里普遍自带，更接近“零依赖”
- 共享的是宿主机真实目录，不受虚拟磁盘大小限制

因此，Sanaka v1 共享文件夹应定义为：

- 正式主路径：`SMB`
- 面向用户叫法：`共享文件夹`
- 不暴露 `SMB`、`smbd`、`10.0.2.4` 之类的内部细节，除非在“查看连接信息”里主动展开

## 目标

第一版要做到：

- 用户可为一台运行中的虚拟机启用或关闭共享文件夹
- 用户可选择一个宿主机目录作为共享目录
- 用户可切换为只读或读写
- 用户可在控制台里看到“当前是否已共享”
- 用户可看到客户机里应该如何访问该共享目录
- 切换共享目录后，Sanaka 能明确告知何时立即生效，何时需要重启该虚拟机
- 如果宿主机缺失必需环境，Sanaka 给出明确用户提示，而不是静默失败

## 非目标

- 本 spec 不实现 `virtiofs`
- 本 spec 不实现 `9p`
- 本 spec 不要求老旧客户机系统百分百自动兼容
- 本 spec 不实现多共享目录同时挂载
- 本 spec 不做企业级权限系统
- 本 spec 不在第一版做“热切换无需重启 QEMU 进程”的复杂方案

## 核心判断

这件事最容易误判的地方有三个：

1. “不装驱动”不等于“不需要客户机里访问协议”
   SMB 方案依赖客户机自带 SMB 客户端，但这不属于额外安装虚拟机驱动。

2. “双方同时写”不等于“所有应用级并发都不会冲突”
   SMB 可以处理正常文件共享语义，但如果宿主机和客户机同时改同一个数据库、镜像文件、Office 文件，仍可能冲突。

3. “随时切换”不等于“QEMU 内部参数全都能热更新”
   第一版更稳的策略是：
   - 虚拟机未运行时：直接改配置
   - 虚拟机运行中：允许用户修改目标目录，但提示“重启虚拟机后生效”

## 用户模型

### 用户看到的概念

用户只需要理解：

- 共享文件夹开关
- 当前共享的宿主机目录
- 是否只读
- 客户机访问方式
- 是否需要重启虚拟机才会生效

用户不需要理解：

- `smbd`
- QEMU `-nic user,smb=...`
- 协议协商细节
- 宿主机进程如何桥接共享

### 用户文案方向

可接受文案例如：

- `共享文件夹`
- `选择宿主机文件夹`
- `允许虚拟机修改文件`
- `访问方式`
- `需要重启虚拟机后生效`
- `宿主机缺少共享所需组件，暂时无法启用共享文件夹`

不应直接暴露：

- `smbd not found`
- `-nic user,smb=...`
- `10.0.2.4` 作为唯一表述

可以在“查看连接信息 / 调试信息”里显示：

- Windows：`\\10.0.2.4\qemu`
- macOS / Linux：`smb://10.0.2.4/qemu`

## 数据模型

为机器配置新增共享目录定义：

```ts
interface SharedFolderConfig {
  enabled: boolean;
  hostPath: string;
  mode: 'readonly' | 'readwrite';
  shareName: string;
}
```

建议挂在：

```ts
machine.sharing = {
  enabled: false,
  hostPath: '',
  mode: 'readwrite',
  shareName: 'qemu'
}
```

首版固定：

- `shareName = "qemu"`

不让用户自定义 share name，先保持稳定。

## Runtime 设计

### 1. 环境检测

Runtime 在应用启动和启动虚拟机前，除 QEMU 自身检测外，再增加共享能力检测：

- 是否存在可用 `smbd`
- 当前平台是否允许 QEMU 走 SMB 共享路径
- 当前机器网络模式是否允许该共享路径

建议新增：

```ts
interface SharedFolderEnvironment {
  available: boolean;
  backend: 'smb';
  smbdPath?: string;
  installHint?: string;
  reason?: string;
}
```

### 2. 命令构建

当：

- `machine.sharing.enabled === true`
- `machine.sharing.hostPath` 非空
- 共享能力可用

则 `QemuCommandBuilder` 在用户态网络参数上增加共享目录导出。

第一版限制：

- 仅在 `network.mode === "user"` 下启用共享
- 如果机器网络关闭，或未来切到 `bridge`，共享文件夹直接不可用并给出说明

如果 QEMU 已经启用 `-nic user` 或 `-netdev user`，共享参数要并入同一条用户态网络配置，而不是额外再起第二套冲突网络。

### 3. 运行时状态

运行态需要暴露共享信息给前端：

```ts
interface RuntimeSharedFolderState {
  enabled: boolean;
  active: boolean;
  backend: 'smb';
  hostPath?: string;
  guestAddress?: string;
  guestUrl?: string;
  mode?: 'readonly' | 'readwrite';
  pendingRestart?: boolean;
  warning?: string;
}
```

说明：

- `enabled`：配置上是否打开
- `active`：当前这一轮 QEMU 启动是否真的带上了共享
- `pendingRestart`：用户运行中改了共享配置，但当前进程还没重启

### 4. 运行中切换策略

第一版不做热切换注入。

规则：

- 虚拟机未运行：
  - 修改后立刻写入机器配置
- 虚拟机运行中：
  - 允许修改
  - 标记 `pendingRestart = true`
  - UI 提示“重启虚拟机后生效”

这样更稳，也更符合 QEMU 这一层的真实能力边界。

## IPC / API

新增或扩展 `electronAPI.runtime` / `electronAPI.machine` 所需接口：

```ts
electronAPI.runtime.getSharedFolderEnvironment(): Promise<SharedFolderEnvironment>
electronAPI.machine.updateSharedFolder(machinePath: string, config: SharedFolderConfig): Promise<{ ok: true }>
```

或者并入已有机器保存接口也可以，但首版建议保留明确语义。

运行态接口里扩展：

```ts
RuntimeMachineState.sharedFolder?: RuntimeSharedFolderState
```

## 前端对接范围

前端这轮不定义视觉实现，只定义必须对接的数据和交互。

需要 Kimi / 前端完成的最小能力：

1. 控制台右侧状态栏出现“共享文件夹”入口
2. 入口可打开一个共享文件夹面板 / 抽屉 / 对话框
3. 面板里能：
   - 开关共享
   - 选宿主机目录
   - 读写 / 只读切换
   - 显示当前共享状态
   - 显示客户机访问方式
   - 如果运行中修改，显示“重启后生效”
4. 前端使用后端返回的共享环境和运行态，不自己硬编码逻辑

## 兼容性判断

### 最适合的客户机

- Windows 7/10/11
- 现代 Linux
- 现代 macOS 客户机

### 风险更高的客户机

- Windows 98 / NT / 2000 / XP 等老系统

原因：

- 老系统的 SMB 版本、加密、来宾访问默认策略更容易出问题

第一版策略：

- 不阻止用户使用
- 但如果检测到模板是老系统，可在 UI 上提示“旧系统可能需要手动访问或兼容设置”

## 关于“无驱动但能运行驱动软件”的说明

如果未来某些共享方案、增强工具、显卡驱动、声卡驱动需要客户机端配合，可以通过这些方式分发：

- 挂载 ISO
- 挂载虚拟软盘
- 共享目录里放安装包

这意味着：

- 可以做到“不需要用户自己去网上找驱动”
- 但不能说成“完全无依赖”

所以这条要和“共享文件夹主路径”区分：

- 共享文件夹主路径：优先选 SMB，争取客户机零额外驱动
- 增强能力路线：可以通过 ISO / 软盘 / 共享目录分发工具包

## 验收标准

- 新建或编辑机器时可以保存共享目录配置
- 控制台能显示共享文件夹当前状态
- 运行中的 x86 Windows 现代客户机可看到共享入口并访问共享目录
- 宿主机和客户机都能在共享目录读写文件
- 宿主机无可用共享环境时，Sanaka 给出明确提示
- 运行中切换共享目录时，Sanaka 明确提示“重启后生效”
- 共享目录不受虚拟磁盘容量限制

## 实施建议

第一阶段先做后端骨架：

- 配置模型
- 环境检测
- QEMU 命令构建
- 运行态字段
- IPC

第二阶段再让前端对接：

- 状态栏按钮
- 共享面板
- 用户提示

这样可以先把真实能力做稳，再让前端接入，不会出现“界面先画好了，后端能力还是假的”。
