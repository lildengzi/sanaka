# Tasks

- [ ] 把 `Windows 10/11` 模板标签收敛为 `Windows 10`，并保留对旧 `template.key = "win11"` 的兼容读取。
- [ ] 调整 `Windows 10` 模板默认值：`q35`、`rtl8139`、`sata`、`std`、`intel-hda`、`UEFI = false`。
- [ ] 调整 `Windows 98` 模板默认值：`i386`、`128 MiB`、`pc`、`cirrus-vga`、`sb16`、`pcnet`、`ide`、`UEFI = false`。
- [ ] 为磁盘模型扩充 `interface = "sata"`，并保留 `ide / scsi / virtio` 兼容。
- [ ] 在创建页磁盘总线选择框中补齐 `IDE / SCSI / SATA / VirtIO` 的用户文案。
- [ ] 在创建页显卡选项中补充 `std`、`qxl`，并整理现有显卡显示名。
- [ ] 在创建页网卡选项中补充 `ne2k_pci`。
- [ ] 把显示前端在主流程中锁定为 `Sanaka`，移除或禁用 `SPICE / VNC` 前端选择。
- [ ] 把 `Sanaka 连接协议` 改成固定显示 `VNC`，不再下拉选择。
- [ ] 收紧音频文案与选项语义，改为宿主机音频后端心智，不再把 `SPICE` 作为主用户向音频方式。
- [ ] 在高级选项中增加 `UEFI` 左右开关，并为数据模型新增对应布尔字段。
- [ ] 为运行时命令构建新增 `sata` 设备映射，不让 `sata` 停留在 UI 假选项层。
- [ ] 为运行时显卡映射补充 `std` 与 `qxl`。
- [ ] 为 UEFI 增加运行时固件检查与启动前报错机制，避免伪成功。
- [ ] 更新测试：模板默认值、UI 选项、运行时映射、旧配置兼容。
