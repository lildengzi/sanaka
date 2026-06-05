# Sanaka Product Architecture

## 目标

这份文档定义 `Sanaka` 的整体产品架构。

它回答这些问题：

- `Sanaka` 这个产品由哪些层组成
- 机器包在系统里处于什么位置
- 前端、显示层、QEMU 执行层如何分工
- 为什么要保留 `Sanaka / SPICE / VNC`
- 音频应该怎么处理

这份架构文档面向正式产品前端，不面向演示原型。

## 核心原则

`Sanaka` 的核心原则如下：

- 桌面端优先
- 跨平台一致体验
- 前端按正式产品实现，不按原型实现
- 机器包是产品级工程对象
- `Sanaka` 是产品体验层，不等于某一种底层显示协议
- 显示、音频、输入、机器配置必须分层

## 四层结构

建议把 `Sanaka` 拆成四个主要层级：

1. Product UI Layer
2. Machine Definition Layer
3. Display Layer
4. Runtime Layer

## 1. Product UI Layer

这一层就是 Electron 应用本身。

职责：

- 首页
- 创建虚拟机工作台
- 机器详情页
- 运行中机器窗口
- 设置页
- 文件打开与导入流程
- 机器包 / `machine.svm` 打开体验

这一层是用户真正感知到的 `Sanaka`。

它不应该直接暴露：

- QEMU 命令细节
- 协议内部细节
- 宿主音频后端细节

对用户来说，它表达的是：

- 一台机器
- 一个模板
- 一种显示体验

而不是一堆底层开关。

## 2. Machine Definition Layer

这一层对应机器包与模板配置。

职责：

- 描述机器包结构
- 描述模板文件
- 保存机器元数据
- 保存显示偏好
- 保存磁盘、网络、硬件配置

这里已经在 [saka-format.md](/Users/steve372dzudo/sanaka/docs/architecture/saka-format.md) 中定义。

它的产品语义是：

- 机器包 = 一台虚拟机的产品对象
- `machine.svm` = 机器包内部的 TOML 主配置
- 模板文件 = 可导入的单文件配置

不是：

- 临时缓存
- 底层运行快照

建议数据流：

1. 用户创建或打开机器
2. UI 读取或生成机器包 / `machine.svm`
3. Runtime Layer 根据 `machine.svm` 生成运行参数
4. Display Layer 根据 `machine.svm` 选择显示方式

### 当前机器包规则

当前规则固定为：

- `macOS`：外层机器包为 `<MachineName>.saka`
- `Windows/Linux`：外层机器目录为 `<MachineName>`
- 包内主配置统一为 `machine.svm`
- 包内预览图固定为 `preview.png`，可缺省
- 旧单文件 `.saka` 只作为导入兼容源

创建行为固定为：

- 新建机器默认直接保存到默认机器目录
- 默认目录优先使用设置中的 `defaultSaveDirectory`
- 未设置时默认使用用户 `Documents/Sanaka`
- “另存到其他位置”是次流程，不是创建主流程

## 3. Display Layer

这一层负责“把虚拟机显示出来，并让用户与之交互”。

它应当区分：

- 产品前端
- 协议后端

### 产品前端概念

在产品层，显示前端有三种：

- `sanaka`
- `spice`
- `vnc`

它们的产品含义如下。

#### `sanaka`

`sanaka` 是产品默认显示体验。

它代表：

- 内建窗口
- 统一工具栏
- 缩放、全屏、快捷键、状态提示
- 和产品其他页面一致的视觉与交互

关键点：

- `sanaka` 不要求第一阶段就是从零自研显示协议栈
- 它首先是产品体验壳

#### `spice`

`spice` 是专业兼容模式。

它适合：

- 更完整的虚拟机交互
- 更成熟的音频路线
- 更接近专业虚拟机显示方案

#### `vnc`

`vnc` 是通用兼容模式。

它适合：

- 更简单的接入
- 更广泛的兼容性
- 安装、救援、轻量显示场景

但它不应成为长期默认主体验。

### 协议后端概念

在技术层，`sanaka` 可以建立在不同后端之上。

建议显式区分：

- 产品前端 `frontend`
- 协议后端 `backend`

例如 `machine.svm` 可以扩展为：

```toml
[display]
frontend = "sanaka"
gpu = "virtio-vga"

[display.sanaka]
backend = "spice"
scale_mode = "fit"
clipboard = true
```

这意味着：

- 用户看到的是 `Sanaka`
- 底层可使用 `SPICE` 或 `VNC`

这个分层非常重要。

否则后面会把：

- 产品概念
- 协议概念
- 实现概念

混在一起。

## 4. Runtime Layer

这一层负责真正启动和管理 QEMU。

职责：

- 读取 `machine.svm`
- 生成 QEMU 参数
- 选择机器架构
- 选择音频后端
- 选择显示协议后端
- 管理生命周期
- 查询运行状态

这层不直接对用户暴露。

它更像一个内部运行引擎。

建议后续拆成：

- Machine Config Resolver
- QEMU Command Builder
- Process Supervisor
- Runtime State Bridge

## 推荐数据流

### 创建一台机器

1. 用户进入首页
2. 打开“创建虚拟机”工作台
3. UI 收集配置
4. 生成或更新机器包 / `machine.svm`
5. 用户点击创建
6. Runtime Layer 根据 `machine.svm` 启动 QEMU
7. Display Layer 打开运行窗口

### 打开机器包

1. 用户双击机器配置
2. `Sanaka` 被系统调起
3. UI 读取机器包或 `machine.svm`
4. 进入编辑或确认界面
5. 用户决定启动或修改

### 启动显示窗口

1. Runtime Layer 启动 QEMU 显示后端
2. Display Layer 根据配置选择前端
3. Product UI Layer 包装成 `Sanaka` 一致体验

## 音频策略

## 问题本质

音频问题必须拆成三层：

1. 客体系统里的虚拟声卡
2. QEMU 到宿主的音频输出
3. 显示链路是否把音频带到前端窗口

这三层不能混为一谈。

## 宿主音频后端

Runtime Layer 应根据平台选择宿主音频后端：

- Linux：优先 `PipeWire`，其次 `PulseAudio`
- macOS：`CoreAudio`
- Windows：`DirectSound`

这里解决的是：

- QEMU 如何在宿主机上发声

不是：

- Electron 显示窗口如何拿到远程音频

## VNC 的问题

`VNC` 最大的问题不是“QEMU 能不能有声音”，而是：

- 前端显示链路里的音频能力不稳

也就是说：

- 你可以让 QEMU 在宿主上用 `PulseAudio` 或 `CoreAudio`
- 但 Electron/Web 里的 VNC 客户端不等于自然就有完整音频体验

因此，`PulseAudio` 不是 VNC 音频体验的根治方案，它只是宿主音频后端的一部分。

## SPICE 的地位

对 `Sanaka` 来说，`SPICE` 应被视为更适合承载“默认正式体验”的底层候选。

原因：

- 音频路线更自然
- 更贴近虚拟机场景
- 不只是画面协议

因此产品建议是：

- `Sanaka` 默认优先考虑跑在 `SPICE` 之上
- `VNC` 作为通用兼容模式保留

## 第一阶段推荐

如果只看短期工程成本：

- `VNC` 最容易跑通画面

如果看正式产品体验，尤其是你明确在意：

- 声音
- 统一显示体验
- 跨平台一致性

那么长期主路线更应是：

- `Sanaka frontend + SPICE-oriented backend`

也就是说：

- 第一阶段可以保留 `VNC`
- 但产品架构上不能把 `VNC` 当最终核心路线

## 显示层推荐策略

### 阶段 1

- 有 `Sanaka`
- 有 `SPICE`
- 有 `VNC`
- UI 上三者都可见

实现优先级：

1. 先完成产品级前端
2. 先打通机器包 / `machine.svm`
3. 先留出 `Sanaka` 壳层
4. `VNC` 可作为最早可运行路径
5. `SPICE` 作为重点能力路线持续推进

### 阶段 2

把 `Sanaka` 从“包一层显示窗口”升级为：

- 完整工具栏
- 剪贴板交互
- 更好的缩放与全屏
- 更清晰的状态与错误提示
- 更稳定的音频策略

### 阶段 3

再评估是否要更深入地做：

- 原生客户端桥接
- 更深的 SPICE 集成
- 更深的 QEMU display 集成

## 为什么不是“直接做纯自研 Sanaka”

因为难点不只是显示画面。

还包括：

- 键鼠输入正确性
- 剪贴板
- 全屏和窗口缩放
- 平台兼容性
- 音频
- 错误恢复
- 连接状态管理

如果第一阶段就要求：

- 跨平台
- 有声音
- 产品体验统一
- 从零做显示内核

那工程复杂度会非常高。

因此更合理的定义是：

- `Sanaka` 先是产品体验层
- 底层显示能力逐步增强

## 文件与架构关系

各文档关系如下：

- [context.md](/Users/steve372dzudo/sanaka/docs/architecture/context.md)
  - 项目背景与当前状态
- [design-spec.md](/Users/steve372dzudo/sanaka/docs/design/design-spec.md)
  - 正式产品前端设计规范
- [design-wireframe.md](/Users/steve372dzudo/sanaka/docs/design/design-wireframe.md)
  - 首页与创建工作台线框
- [saka-format.md](/Users/steve372dzudo/sanaka/docs/architecture/saka-format.md)
  - 机器包与 `machine.svm` 格式
- [display-architecture.md](/Users/steve372dzudo/sanaka/docs/architecture/display-architecture.md)
  - 显示层分层与路线

本文件负责把这些内容合并到一个统一产品架构里。

## 一句话总结

`Sanaka` 的正式产品结构应当是：

- Electron 负责产品体验
- 机器包 / `machine.svm` 负责机器定义
- Display Layer 负责 `Sanaka / SPICE / VNC`
- Runtime Layer 负责 QEMU 启动与管理

而在音频上：

- 宿主音频后端只是基础设施
- `VNC` 不能自然解决产品级音频体验
- 长期主路线应优先围绕 `Sanaka + SPICE` 构建
