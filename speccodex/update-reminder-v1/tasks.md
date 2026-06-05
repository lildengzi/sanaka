# Tasks

- [ ] 设计并确认远程 `update.toml` 结构。
- [ ] 在主进程新增 updater 模块，负责拉取和解析远程 TOML。
- [ ] 新增版本比较逻辑，稳定处理 `release` / `beta`。
- [ ] 实现本地 channel 推导：版本号含 `beta` 即视为 `beta`，否则为 `release`。
- [ ] 实现 channel 过滤规则：release 只看 release，beta 看 beta 和 release。
- [ ] 在设置存储中新增 `skippedVersion`。
- [ ] 实现“跳过此版本”写入和读取逻辑。
- [ ] 新增 `electronAPI.updater.getCurrentInfo()`。
- [ ] 新增 `electronAPI.updater.checkForUpdates()`。
- [ ] 新增 `electronAPI.updater.skipVersion(version)`。
- [ ] 新增 `electronAPI.updater.openUpdatePage(url)`。
- [ ] 新增启动后静默检查逻辑。
- [ ] 新增运行期间每 8 小时主动检查逻辑。
- [ ] 新增设置页“检查更新”入口所需后端返回状态。
- [ ] 编写单元测试：版本比较、channel 过滤、跳过版本逻辑、TOML 解析失败。
- [ ] 与前端对接更新提醒弹层的数据结构。
- [ ] 手工验证 macOS / Windows 默认浏览器打开行为。
