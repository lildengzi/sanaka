# Sanaka Display Architecture

## 目标

这份文档定义 `Sanaka` 的显示前端架构。

核心问题不是“要不要有 `Sanaka` 显示前端”，而是：

- `Sanaka` 在产品上代表什么
- 它和 `SPICE`、`VNC`、`QEMU` 的关系是什么
- 第一阶段应该怎么实现，成本才合理

## 结论

`Sanaka` 应该有，而且应该作为一等显示前端概念存在。

但这里要明确：

- `Sanaka` 不一定等于一套从零开始自研的显示协议
- `Sanaka` 可以先是一个 **产品级显示壳**
- 底层先接成熟显示后端，再逐步增强

最稳的路线是：

1. 产品层保留 `Sanaka`
2. 底层第一阶段复用 `SPICE` 或 `VNC`
3. 后续再逐步演进成更深的内建显示前端

## 产品语义

在 `Sanaka` 里，显示前端建议分成三个选项：

- `Sanaka`
- `SPICE`
- `VNC`

这三个选项的意义不完全相同。

### `Sanaka`

`Sanaka` 是产品级前端体验。

它代表：

- Electron 内建显示窗口
- 统一的工具栏和操作区
- 自己的全屏、缩放、状态提示、快捷键、剪贴板 UI
- 对用户来说是“Sanaka 原生体验”

它不要求第一天就拥有独立于所有协议的渲染内核。

### `SPICE`

`SPICE` 是一个成熟的远程显示协议和生态。

官方文档把它定义为一个为虚拟机远程访问提供显示、输入、音频、USB 等能力的开源解决方案，并指出 QEMU 是其主要服务端使用者之一。  
来源：

- [SPICE Home](https://www.spice-space.org/)
- [SPICE User Manual](https://www.spice-space.org/spice-user-manual.html)

### `VNC`

`VNC` 是更通用、更简单、生态更广的显示方式。

它的优点是：

- 兼容性广
- 浏览器侧方案成熟
- 接入 Electron 成本更低

但在虚拟机交互体验上，一般不如完整 SPICE 生态丰富。

## QEMU 现有能力

QEMU 官方文档明确支持图形输出和远程显示后端。

官方 invocation 文档说明，图形显示可以和 `VNC` 或 `SPICE` 配合使用。  
来源：

- [QEMU Invocation](https://www.qemu.org/docs/master/system/invocation.html)

QEMU 的 QMP 参考文档中也有 `query-spice` 等接口，说明在启用 SPICE 时可以查询其运行状态。  
来源：

- [QEMU QMP Reference Manual](https://www.qemu.org/docs/master/interop/qemu-qmp-ref.html)

另外，QEMU 官方还提供了 `D-Bus display`，允许把显示导出给进程外 UI 使用。官方描述是：

- QEMU 可以通过 `-display dbus` 导出显示
- 用于 out-of-process UI、remote protocol servers 或其他交互式显示用途

来源：

- [QEMU D-Bus display](https://www.qemu.org/docs/master/interop/dbus-display)

## 难度判断

## 方案 A：Sanaka UI + VNC 后端

这是第一阶段最容易落地的方案。

做法：

1. QEMU 启用 VNC
2. Electron 内嵌浏览器前端
3. 使用 noVNC 连接 VNC
4. Sanaka 负责外层产品 UI

可行性依据：

- noVNC 官方将自己定义为 HTML5 VNC 客户端
- 官方明确指出它可作为 JavaScript 库或应用集成
- 官方还说明很多服务端包括 QEMU 都可配合使用

来源：

- [noVNC GitHub](https://github.com/novnc/noVNC)

优点：

- 接入最快
- Electron 集成自然
- 跨平台最好控
- Web 技术栈最顺手

缺点：

- 显示体验和高级设备能力不如完整 SPICE 路线
- 远期品牌差异化有限

难度判断：

- 低到中

## 方案 B：Sanaka UI + SPICE HTML5 / Web client

这是看起来更贴近虚拟机产品，但现实上要谨慎的方案。

SPICE 官方网站确实提供了 `spice-html5` 路线，但官方描述非常直接：

- 它是 prototype Web client
- 功能有限
- 速度偏慢
- 缺很多特性，例如 audio、video、agent 等

来源：

- [SPICE HTML5 Client](https://www.spice-space.org/spice-html5.html)

SPICE 下载页也仍然把它称作一个简单的 JavaScript Web client。  
来源：

- [SPICE Download](https://www.spice-space.org/download.html)

这意味着：

- 它能证明“Electron 里做 SPICE 客户端”是可行的
- 但它不适合作为你第一阶段要押宝的正式体验内核

优点：

- 更贴近虚拟机专业场景
- 理论上能力空间比 VNC 更强
- 产品叙事上比 VNC 更高级

缺点：

- 官方 Web 客户端成熟度一般
- 兼容性和维护成本更难控
- 在 Electron 里想做到稳定跨平台，不会比 noVNC 轻松

难度判断：

- 中到高

## 方案 C：Sanaka 自研显示前端

这是最理想、也最贵的路线。

做法可能包括：

- 直接吃 QEMU 显示导出能力
- 处理帧缓冲或显示命令
- 自己处理键鼠事件
- 自己做剪贴板、缩放、全屏、多显示器、输入法等

如果走得更深，还要处理：

- 音频
- 光标同步
- 剪贴板
- 客户机代理
- USB 重定向
- 文件传输

SPICE 文档本身也说明，一个完整客户端不仅是画面渲染，还涉及事件循环、输入重定向、全屏、连接/断开、错误处理等系统性工作。  
来源：

- [Spice for Newbies](https://www.spice-space.org/spice-for-newbies.html)

这类路线的难点不在“能不能显示一张图”，而在：

- 交互正确性
- 平台兼容性
- 稳定性
- 长期维护

难度判断：

- 高

## 推荐路线

对 `Sanaka` 来说，我建议的分阶段路线是：

### 第一阶段

保留前端选项：

- `Sanaka`
- `SPICE`
- `VNC`

但实现上这样映射：

- `Sanaka`
  - Electron 原生显示窗口
  - 底层先走 `VNC + noVNC`
- `VNC`
  - 暴露原始/兼容 VNC 配置
- `SPICE`
  - 先作为高级/实验性选项保留

也就是说，第一阶段的 `Sanaka` 可以是：

- `Sanaka` 产品壳
- `VNC` 作为底层显示传输

这不丢人，反而是最合理的工程路线。

### 第二阶段

把 `Sanaka` 从“包 VNC 的产品壳”逐渐升级为：

- 增强显示控制
- 更好的键鼠和全屏体验
- 更细的状态同步
- 更原生的工具栏和交互层

这一阶段依然可以继续跑在 VNC 或 SPICE 之上。

### 第三阶段

再评估是否值得做更深的内建显示层。

这时候可以研究：

- 更深的 SPICE 集成
- 原生客户端桥接
- QEMU D-Bus display 的利用方式
- 自己的显示渲染抽象层

## 为什么仍然要保留 `Sanaka`

因为 `Sanaka` 是你的产品体验，而不是协议名。

用户不应该被迫理解：

- SPICE 是什么
- VNC 是什么
- QEMU 的显示栈怎么分层

对用户来说，他们只需要知道：

- `Sanaka`
  - 默认、推荐、体验统一
- `SPICE`
  - 专业兼容模式
- `VNC`
  - 通用兼容模式

这和浏览器的“默认渲染路径”和“高级兼容模式”是同一种产品逻辑。

## 与 `.saka` 的关系

`.saka` 文件里的显示配置应保留：

```toml
[display]
frontend = "sanaka"
gpu = "virtio-vga"
```

如果选择具体后端，再启用子表：

```toml
[display.vnc]
port = 5901
address = "127.0.0.1"
```

或：

```toml
[display.spice]
port = 5930
address = "127.0.0.1"
clipboard = true
audio = true
```

这使得：

- `frontend = "sanaka"` 代表产品级首选
- 底层后端仍然可配置

后续如果需要，也可以加：

```toml
[display.sanaka]
backend = "vnc"
scale_mode = "fit"
clipboard = true
```

这样就把“产品前端”和“协议后端”拆开了。

## 现实建议

如果你问：

- “能不能有 Sanaka？”

答案是：

- 能，而且应该有

如果你问：

- “第一阶段直接做真正自研 Sanaka 显示内核难不难？”

答案是：

- 难，而且不值得作为第一步

如果你问：

- “第一阶段能不能把 Sanaka 做成跨平台统一体验？”

答案是：

- 能，前提是先把它做成 Electron 产品壳，底层复用成熟后端

## 最终建议

第一阶段推荐顺序：

1. 先完成正式产品级前端
2. 先把 `.saka` 工程文件格式定好
3. 先用 `Sanaka UI + VNC(noVNC)` 跑通
4. 把 `SPICE` 作为后续增强或实验性路线保留
5. 等产品形态稳定后，再评估更深的原生显示栈

## 一句话总结

`Sanaka` 应该存在，但第一阶段它更适合作为：

- **你自己的显示产品层**

而不是一上来就要求它成为：

- **从零实现的跨平台虚拟机显示协议前端**
