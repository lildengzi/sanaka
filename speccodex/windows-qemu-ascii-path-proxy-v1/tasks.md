# Tasks

- [ ] 盘点所有会把本地文件路径传给 QEMU 的 runtime 入口
- [ ] 设计 `resolveQemuLaunchPath(...)` 的输入输出结构
- [ ] 实现 Windows 非 ASCII 检测与 ASCII 直通逻辑
- [ ] 实现 Windows 短路径获取能力
- [ ] 设计并实现短路径不可用时的运行时代理入口策略
- [ ] 将磁盘路径接入代理层
- [ ] 将 ISO / floppy 路径接入代理层
- [ ] 将 firmware code / vars 路径接入代理层
- [ ] 将 `previewMachineCommand()` 接入同一代理层
- [ ] 将 `changeMedia()` 接入同一代理层
- [ ] 补充 runtime log / 诊断信息
- [ ] 补充 Windows 路径代理测试矩阵
- [ ] 验证 ASCII 路径无回归
