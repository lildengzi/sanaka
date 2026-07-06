# Windows QEMU ASCII Path Proxy v1

## 背景

`Sanaka` 当前在 Windows 上会把机器配置中的文件路径直接传给 `QEMU`，例如：

- 磁盘镜像
- ISO
- floppy
- UEFI firmware

当路径只包含 ASCII 时，这条链路通常可正常工作。

但当路径包含中文或其他非 ASCII 字符时，当前链路会出现明显的不稳定行为：

- `Sanaka` UI 中路径显示正常
- 配置文件中路径保存正常
- `QEMU` 启动时却无法打开对应文件
- `QEMU` stderr 中路径常伴随乱码

这说明问题不在 `Sanaka` 的 UI 显示层，而在：

- Windows 下 `QEMU` 对非 ASCII 路径的处理兼容性
- 或 `QEMU` 所依赖的底层路径打开链路

因此 `v1` 不试图在 `Sanaka` 内部“修复 QEMU 的 Unicode 支持”，而是在 `Sanaka` runtime 层提供一个**QEMU 可消费路径代理层**。

## 目标

`v1` 目标是：

1. Windows 下凡是要传给 `QEMU` 的本地文件路径，都先经过一层运行时代理解析
2. 当原始路径包含非 ASCII 字符时，优先为 `QEMU` 提供 ASCII 可访问路径
3. 用户在 UI、配置文件、recent、bundle 中看到的仍然是原始真实路径
4. 代理层只影响 runtime 启动参数，不改变用户数据模型
5. 启动、预览命令、热插拔介质等入口尽量走同一条路径解析规则

## 非目标

`v1` 不做以下事情：

1. 不修改用户在 machine 配置中保存的原始路径
2. 不要求前端暴露“代理路径”概念
3. 不承诺修复用户手写所有 custom QEMU 参数中的任意路径
4. 不实现通用 Unicode 文件系统抽象层
5. 不修改 `QEMU` 本体或假设用户机器上的 `QEMU` 行为一定一致

## 核心原则

### 1. 原始路径是真相源

机器配置中的：

- `disk.path`
- `media.iso`
- `media.floppy`
- `advanced.firmware.*`

仍然保存用户原始路径。

代理路径只在 runtime 启动前临时派生。

### 2. 只有 Windows 启用代理

`ASCII path proxy` 是为 Windows + QEMU 的兼容问题准备的。

在：

- macOS
- Linux

不启用这层代理。

### 3. 优先最小侵入

如果原始路径本身已经是 ASCII 且可直接用于 `QEMU`，就不做额外代理。

只有满足以下条件时才进入代理流程：

- host platform = `win32`
- 路径非空
- 路径中存在非 ASCII 字符，或需要走 Windows 路径兼容修正

### 4. 代理结果必须对 QEMU 稳定

传给 `QEMU` 的最终路径应满足：

- 尽量仅包含 ASCII
- 尽量避免依赖中文目录名
- 尽量不要求 QEMU 正确处理本地代码页 / UTF-8 / 宽字符边界

## 代理策略

### 1. 解析入口

`Sanaka` 在构建 QEMU 命令前，对所有文件类路径统一调用：

- `resolveQemuLaunchPath(...)`

这类路径包括：

- 磁盘镜像
- ISO
- floppy
- UEFI firmware code / vars

### 2. 首选策略：Windows 短路径

当原始路径包含非 ASCII 时，优先尝试获取该文件的 Windows 短路径（8.3 path）。

如果成功，并且结果为 ASCII 可消费路径，则：

- `QEMU` 使用短路径
- UI 仍显示原始路径

原因：

- 短路径通常不需要复制文件
- 对大磁盘镜像最友好
- 启动开销最小

### 3. 次选策略：运行时 ASCII 代理目录

如果短路径不可用，或目标卷未启用短路径，使用运行时代理目录。

策略建议：

- 在 `Sanaka userData/runtime/<machineId>/path-proxy/` 下创建 ASCII 命名代理入口
- 优先创建 Windows 文件系统级链接入口
- 代理名应稳定、可预测、仅包含 ASCII

代理入口示例：

- `disk-0.qcow2`
- `iso-0.iso`
- `floppy-0.img`
- `firmware-code.fd`
- `firmware-vars.fd`

### 4. 代理失败时降级

如果无法创建短路径、也无法创建代理入口：

- 保留原始路径作为最后降级
- 同时返回结构化诊断信息

这样可以保证：

- 不会因代理层本身失败而完全阻断启动尝试
- 但日志和错误信息中要能看出代理步骤失败

## 作用范围

### A. QEMU 启动命令

`RuntimeManager.startMachine()` 走到 `QemuCommandBuilder.build()` 前，应先拿到可供 `QEMU` 使用的路径。

### B. 预览命令

`previewMachineCommand()` 中展示的完整命令，应与真实启动尽量一致。

也就是说：

- 在 Windows 上，如果启动会用代理路径
- 命令预览也应反映这一事实

### C. 运行时换盘 / 挂载

运行中的介质变更，例如：

- `changeMedia()`

也应复用同一套 Windows 代理逻辑，而不是继续直接把原始路径塞给 QMP / QEMU。

## 数据与状态

### 1. 不改 machine schema

`v1` 不新增持久化字段存储代理路径。

### 2. 允许 runtime 内部缓存代理结果

为了避免一次启动中重复解析，runtime 可缓存：

- 原始路径
- 代理路径
- 代理策略来源（direct / short-path / runtime-link / fallback）

缓存生命周期可以限定在：

- 单次启动
- 单个 runtime session

### 3. 日志需要可诊断

runtime log 中应能够看到：

- 哪个原始路径进入了代理解析
- 最终给 `QEMU` 的路径是什么
- 使用了哪种策略
- 若失败，失败在哪一步

但用户向错误提示仍应克制，不把内部实现细节直接砸给普通用户。

## 用户可见行为

### 1. UI 继续显示真实路径

例如用户选中：

- `G:\Downloads\小叉屁\xp.qcow2`

那么：

- Builder 页面显示真实路径
- Details 页面显示真实路径
- recent / bundle / schema 仍是真实路径

### 2. 启动命令预览可分两层

如果当前页面展示“完整命令行”，`v1` 允许展示实际传给 `QEMU` 的路径。

这是因为：

- 命令预览本身就是高级 / 调试视图
- 它更应反映真实运行时行为

### 3. 错误提示要更接近真实问题

如果 Windows 上路径代理已启用但仍失败，用户错误信息应更接近：

- 文件不存在
- 无法创建代理入口
- QEMU 仍无法打开代理路径

而不是把所有问题都混成“系统找不到指定文件”。

## 风险与兼容点

### 1. Windows 短路径未必可用

有些卷可能关闭 8.3 短路径。

因此不能把短路径当成唯一方案。

### 2. 代理入口不能复制大文件

对 `qcow2`、`img`、`iso` 等大文件，`v1` 不应采用复制整份文件的方案。

复制会导致：

- 启动极慢
- 占用巨大磁盘空间
- 语义错误（运行时写入会分叉）

### 3. 不同介质类型的代理方式必须一致可靠

磁盘、ISO、firmware 虽然都是文件，但调用链不同。

需要确保：

- 启动时的 `-drive`
- 运行时换盘

都不会走成两套不一致逻辑。

### 4. 清理策略要明确

运行时代理入口如果需要落在 `runtime/` 下，应在：

- runtime 结束
- 或下次启动重建

时保持可控清理，不无限堆积。

## 验收标准

### 1. Windows 下非 ASCII 磁盘路径可启动

例如：

- `G:\Downloads\小叉屁\xp.qcow2`

在 `Sanaka` 中能成功用于 `QEMU` 启动。

### 2. ASCII 路径行为不回退

纯 ASCII 路径现有能工作的机器，行为不应被这次改坏。

### 3. ISO / floppy / firmware 进入同一代理层

不只修磁盘，其他文件类路径也统一走规则。

### 4. 预览命令与真实启动一致

Windows 下如果用了代理路径，命令预览也能反映这一点。

### 5. 相关测试通过

至少应覆盖：

- ASCII 路径直通
- 非 ASCII 路径走短路径
- 短路径不可用时走代理入口
- 代理失败时的降级与错误行为
