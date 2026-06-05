# Sanaka 控制台 VNC 启动连接稳定性 Spec

## 背景

当前现象：

- 虚拟机启动或重启后，控制台会先连上。
- 约 1-2 秒后 noVNC 断开。
- 应用有时显示“关机”或回到启动态。
- 用户再次点击启动或重新连接后，控制台又能正常显示。
- 实际上 QEMU 没有关机，问题主要发生在显示连接层和运行状态同步层。

这说明当前控制台把“显示连接断开”和“虚拟机运行状态”混在了一起。VNC/websocket 的短暂断开不应该让 Sanaka 判断虚拟机已经关机，也不应该让 UI 陷入“停止中”。

## 目标

第一目标是直接解决启动后 1-2 秒断开的问题，而不是只靠固定延迟遮住问题。

目标行为：

- 虚拟机启动后，控制台只在 VNC websocket 真正稳定可用时创建 noVNC 会话。
- 如果启动初期 VNC 短断，控制台自动重连，不需要用户再次点击。
- noVNC 连接断开只影响“画面连接状态”，不能改变机器运行状态。
- 机器运行状态只能来自 Runtime/QMP/进程生命周期，不能来自 noVNC 连接结果。
- 用户点击控制台关机确认后，才进入终止流程。
- 任何情况下都不能因为 VNC 短断进入长期“停止中”。

## 非目标

- 本 spec 不引入 SPICE 正式显示前端。
- 本 spec 不实现真实音频。
- 本 spec 不改变控制台视觉设计。
- 本 spec 不把 noVNC 断开当作虚拟机死亡。
- 本 spec 不要求用户理解 VNC、websocket、QMP 等内部细节。

## 核心判断

现在最可疑的根因有三类：

1. QEMU 启动时 VNC websocket 端口先开放，但显示服务还不稳定。
2. noVNC 太早连接，连接建立后又被 QEMU 初期显示重置断开。
3. Runtime 层或前端把 QMP `SHUTDOWN`、noVNC disconnect、process exit 三种事件混成了“关机”。

需要明确拆开三种状态：

- Machine runtime state：虚拟机是否启动、运行、终止。
- Display connection state：noVNC 是否已连接到画面。
- User termination intent：用户是否明确点击了终止。

## 设计规则

### 1. Runtime 状态来源

Runtime 状态只允许由以下来源改变：

- QEMU 子进程 exit/error。
- Sanaka 主动 start / force stop / reset。
- QMP `query-status` 或明确可解释的运行事件。

VNC 连接断开不能改变 runtime 状态。

规则：

- `noVNC disconnect` 不得触发 `machine-stopping`。
- QMP `SHUTDOWN` 不能直接推断为用户关机。
- 只有 Sanaka 已经处于主动停止流程时，`SHUTDOWN` 才能辅助确认停止。
- 真正的关机完成以 QEMU process exit 为准。

### 2. Display 连接状态

控制台页面需要独立维护 display connection state。

建议状态：

```ts
type DisplayConnectionState =
  | 'waiting-runtime'
  | 'waiting-display'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'unavailable';
```

用户文案只显示：

- `启动中...`
- `正在连接画面...`
- `正在恢复画面...`
- `暂时无法连接到虚拟机画面`

不要显示内部错误词，如 `disconnect`、`credentials-required`。

### 3. VNC 就绪检测

不要只看 `runtimeState.status === "running"` 就立即创建 noVNC。

控制台进入 noVNC 前应先做显示连接预检：

- 后端提供 `runtime.checkDisplay(machineId)` 或 `runtime.getMachineState(machineId)` 扩展字段。
- 检查 websocket 端口是否能建立 TCP/WebSocket 连接。
- 如果未就绪，前端保持“启动中...”或“正在连接画面...”。
- 默认最多等待 8-10 秒。
- 等待期间不允许把机器标记为关机。

首版可选较轻实现：

- 前端拿到 `displayWebSocketPort` 后，不立即 mount noVNC。
- 先等待一个短稳定窗口，例如端口可连接后再等 300-500ms。
- 如果 noVNC 初次连接 2 秒内断开，自动进入 reconnect，不显示关机。

### 4. 自动重连策略

noVNC 断开后：

- 如果 runtime 仍是 `running` / `starting` / `resetting`，进入 `reconnecting`。
- 不显示“关机”。
- 不显示中心启动按钮。
- 自动重连。

建议重连节奏：

```text
0.5s, 1s, 1.5s, 2s, 3s
```

最多重连 10-15 秒。

如果超过上限：

- runtime 仍运行：显示“暂时无法连接到虚拟机画面”，保留重试按钮。
- runtime 已退出：显示“关机”。

### 5. 延迟连接保底

如果短期内无法完成可靠就绪检测，可以接受保底方案：

- QEMU 返回 `machine-running` 后，控制台等待 2-3 秒再创建 noVNC。
- 等待期间显示 `启动中...`。
- 这只是保底，不是最终目标。

保底方案也必须满足：

- 不进入“停止中”。
- 不显示“关机”。
- 用户不需要再次点击启动。

当前实现不默认启用首次延迟。最新判断是：旧的 `machine-stopped` 延迟清理可能在重新启动后删除新的 running 状态，导致控制台误卸载 noVNC。应优先修状态清理竞争，而不是继续增加等待。

### 6. 重启行为

用户点击重置后：

- runtime 可短暂进入 `resetting`。
- 控制台显示 `启动中...` 或 `正在恢复画面...`。
- noVNC 可以断开并自动重连。
- 不允许显示“关机”，除非 QEMU process exit。
- 不允许显示中心启动按钮，除非 runtime 已确认 stopped。

### 7. 终止行为

用户点击控制台电源按钮后：

- 弹确认框。
- 用户确认后执行 `forceStopMachine`。
- 这时可以进入停止流程。
- 前端应尽快回到“关机 / 启动”状态。
- 不允许长时间停在“停止中”。

## 推荐实现

### Runtime 层

新增或收紧：

- `RuntimeMachineState.displayConnectionHint`
- `RuntimeMachineState.displayReadyAt?`
- `runtime.checkDisplay(machineId)`
- QMP `SHUTDOWN` 不直接改 `stopping`
- process exit 才是 stopped 的唯一强信号

建议接口：

```ts
interface RuntimeDisplayReadiness {
  machineId: string;
  backend: 'vnc' | 'spice';
  port: number;
  websocketPort?: number;
  ready: boolean;
  checkedAt: string;
  error?: string;
}
```

### Frontend 层

`NoVncViewport` 应接受更明确的控制参数：

```ts
interface NoVncViewportProps {
  active: boolean;
  websocketPort?: number;
  password?: string;
  machineRunning: boolean;
  reconnectWindowMs?: number;
  initialDelayMs?: number;
  onConnectionStateChange?: (state: DisplayConnectionState) => void;
}
```

控制台页面：

- runtime state 负责顶部状态。
- display state 负责画面区域。
- 只有 runtime stopped 时才显示中心“启动”按钮。
- display disconnected 时显示“正在恢复画面...”或“暂时无法连接到虚拟机画面”。

## 验收标准

- 启动虚拟机后，控制台不会在 1-2 秒后停到“关机”。
- 启动初期如果 noVNC 断开，能自动恢复，不需要再次点击。
- 重启虚拟机时，控制台显示启动/恢复画面状态，而不是关机。
- noVNC 断开不会触发 runtime stopped。
- QMP `SHUTDOWN` 不会在非主动停止流程中把机器标记为 stopping。
- 用户确认终止后，机器能快速回到关机状态。
- 任何测试路径都不能长期停在“停止中”。

## 手工测试场景

1. 冷启动 Windows 10/11 虚拟机，观察前 10 秒控制台状态。
2. 启动后立刻进入控制台，不手动重新连接，确认画面能自动恢复。
3. 控制台点击重置，确认不会显示关机或停止中。
4. VNC 短断时确认首页/详情页仍显示运行中。
5. 点击电源按钮，确认弹窗后立即终止。
6. 终止后再次启动，确认不会卡停止中。

## 当前建议

优先做“连接状态分离 + 自动重连 + QMP 事件收紧”。

如果仍不稳定，再临时加入 2-3 秒 initial display delay。这个延迟应该只用于首次 noVNC mount，不应该改变 runtime 状态。
