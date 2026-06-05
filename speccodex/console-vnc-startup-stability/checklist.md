# Checklist

- [x] 启动后 1-2 秒 noVNC 断开时，不显示关机。
- [x] 启动后 1-2 秒 noVNC 断开时，不进入停止中。
- [x] 启动后 noVNC 能自动恢复，不需要用户再次点击启动。
- [x] 旧的 stopped 延迟清理不会删除新的 running 状态。
- [ ] 重置后显示启动/恢复画面状态。
- [ ] 重置后不显示中心启动按钮，除非 QEMU 真的退出。
- [ ] QEMU process exit 是 stopped 的强信号。
- [x] VNC/websocket disconnect 只是 display connection state。
- [x] 主动终止后能快速回到关机状态。
- [x] 测试覆盖 QMP `SHUTDOWN` 误判问题。
- [x] 测试覆盖 noVNC 自动重连或延迟连接策略。
