# Tasks

- [x] 梳理当前 Runtime 状态来源，确认 `noVNC disconnect` 不会写入 runtime state。
- [x] 收紧 QMP `SHUTDOWN` 处理，只在主动停止流程中进入 stopping。
- [x] 为控制台拆出 `DisplayConnectionState`，不要复用 runtime stopped/running 表达画面连接状态。
- [x] 修改 `NoVncViewport`，支持 clean disconnect 和 abnormal disconnect 的自动重连。
- [x] 移除默认首次连接延迟，避免用等待掩盖状态竞争。
- [x] 修复 stopped 延迟清理竞争，避免旧 stopped timer 删除新的 running 状态。
- [x] 控制台画面区根据 display state 显示“启动中... / 正在连接画面... / 正在恢复画面...”。
- [x] 确保 runtime stopped 之前不显示中心“启动”按钮。
- [x] 增加 Runtime 单元测试：非主动停止时 QMP `SHUTDOWN` 不会变 stopping。
- [x] 增加 NoVncViewport 或控制台组件测试：运行中断线后显示恢复态而不是关机。
- [ ] 手工测试冷启动、重启、终止、再次启动四条路径。
