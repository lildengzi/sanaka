# Sanaka 模板兼容性与显示收口 Spec

## 背景

当前 `Sanaka` 的机器模板和创建页有几处方向不一致：

1. `Windows 10/11` 模板仍然沿用偏性能的默认项，例如 `virtio-net-pci`、磁盘默认容易落到 `VirtIO` 语义，但真实用户第一步更关心“能不能顺利装上系统、能不能直接识别设备”。
2. 创建页仍然暴露了 `SPICE / VNC / Sanaka` 这套多前端选择，但当前正式显示路径实际上是 `Sanaka + VNC/noVNC`，`SPICE` 前端并未形成正式完成态。
3. 旧系统模板与现代系统模板没有形成清晰的“兼容性优先 / 现代兼容优先”分层，导致 `Win98` 和 `Windows 10` 的默认值不够鲜明。
4. 音频、显示、磁盘总线这几块存在“UI 看起来什么都能选，但产品主路线并没有完全收口”的问题。

这次 spec 的目标不是把所有底层硬件一次做满，而是把用户能看见、会直接影响装机成功率的默认规则先收对。

## 目标

这次规则固定为：

- `Windows 10/11` 模板正式改名为 `Windows 10`
- `Windows 10` 模板默认走兼容性优先的现代配置，不再默认依赖 VirtIO 存储或 VirtIO 网卡驱动
- `Windows 98` 模板正式收敛成“旧系统兼容模板”
- 磁盘总线在创建页显式提供：
  - `IDE（兼容性）`
  - `SCSI（冷门）`
  - `SATA（稍快）`
  - `VirtIO（快，半虚拟化总线，需安装驱动）`
- 高级选项新增 `UEFI` 左右开关
- 显卡选项补充 `std`、`qxl`
- 网卡选项补充 `ne2k_pci`
- 显示前端在当前正式产品范围内锁定为 `Sanaka`
- `Sanaka 连接协议` 的用户向内容改成固定 `VNC`
- 当前主路线不再把 `SPICE` 暴露成正式显示前端
- 当前主路线不把 `VNC` 描述成正式音频传输方案，音频仍走宿主机音频后端

## 非目标

- 本 spec 不把 `SPICE` 正式做完
- 本 spec 不承诺浏览器内 `VNC/noVNC` 直接传音
- 本 spec 不重做控制台页面整体设计
- 本 spec 不扩成完整的固件管理器
- 本 spec 不讨论 TPM、安全启动、快照等更高阶运行时能力

## 核心原则

### 1. 模板首先服务于“装得上”

对 `Windows 10` 和 `Windows 98` 这样的系统模板，默认值应优先提升首次安装成功率，而不是先追求半虚拟化性能。

结论：

- 对 Windows 模板，默认值优先考虑系统开箱识别能力
- VirtIO 保留，但不再作为首发默认值
- Linux 模板仍可继续偏向 VirtIO

### 2. 旧系统与现代系统必须分层

模板应形成两套清晰心智：

- `Windows 98`：旧系统兼容优先
- `Windows 10`：现代兼容优先

不能再让两者共用太多“看起来高级、但默认不一定好装”的值。

### 3. 当前显示主路线必须收口

既然当前正式显示路线是 `Sanaka + VNC/noVNC`，那么创建页和设置页就不应继续暗示：

- `SPICE` 前端已经正式可用
- `Sanaka` 后端可以自由在 `SPICE / VNC` 间切换

这次要把显示语义收成：

- 前端：`Sanaka`
- 显示协议：`VNC`

### 4. 音频与显示分离

当前产品里，音频不应再用“显示协议附带音频”的心智来解释。

正式语义改为：

- 显示：`Sanaka + VNC`
- 音频：QEMU 直连宿主机音频后端（如 `CoreAudio / PipeWire / PulseAudio / DirectSound`）

不要让用户误以为：

- 只要选了 `VNC`，声音就会自然跟过去
- `SPICE` 仍然是当前正式音频主路线

## 模板规则

## Windows 10 模板

原模板：

- `template.key = "win11"`
- `template.label = "Windows 10/11"`

调整后：

- `template.key` 暂时可保持 `win11` 以兼容现有数据
- `template.label` 改为 `Windows 10`
- `title` 改为 `Windows 10 Template`
- `description` 调整为现代 Windows 兼容安装模板

默认硬件规则：

- 架构：`x86_64`
- 内存：保留 `4096 MiB`
- CPU：保留 `2`
- 机器类型：`q35`
- 启动顺序：`cdrom`
- UEFI：默认 `false`
- 默认磁盘总线：`sata`
- 默认网卡：`rtl8139`
- 默认显卡：`std`
- 默认声卡：`intel-hda`

说明：

- `sata` 作为现代兼容默认值
- `virtio` 保留为高级性能选项，但不再默认
- `rtl8139` 比 `virtio-net-pci` 更适合作为 Windows 安装模板默认值
- `std` 比 `virtio-vga` 更符合“系统先装起来”的默认目标

## Windows 98 模板

`Windows 98` 模板正式固定为旧系统兼容模板。

默认硬件规则：

- 架构：`i386`
- 内存：`128 MiB`
- CPU：`1`
- 机器类型：`pc`
- 启动顺序：`cdrom`
- UEFI：强制 `false`
- 默认磁盘总线：`ide`
- 默认显卡：`cirrus-vga`
- 默认声卡：`sb16`
- 默认网卡：`pcnet`

网卡备选：

- `pcnet`
- `ne2k_pci`
- `rtl8139`

说明：

- `pc` 在当前语义里就是 `i440fx PC` 路线
- `cirrus-vga` 对旧系统模板更合理
- `sb16` 是旧系统声卡默认值
- `pcnet` 作为默认值比 `ne2k_pci` 更稳
- `ne2k_pci` 保留为复古兼容备选

## Linux Generic 模板

Linux 模板继续保留偏现代、偏 VirtIO 的方向。

默认值本轮不强制改：

- 可继续使用 `virtio-net-pci`
- 可继续使用 `virtio-vga`
- 默认磁盘总线可继续保持 `virtio`

这样可以形成清晰的产品层次：

- Windows 模板偏兼容
- Linux 模板偏性能

## 创建页与数据模型规则

## 磁盘总线

`[[disks]].interface` 目前只有：

- `ide`
- `virtio`
- `scsi`

这次扩成：

- `ide`
- `scsi`
- `sata`
- `virtio`

用户向文案固定为：

- `IDE（兼容性）`
- `SCSI（冷门）`
- `SATA（稍快）`
- `VirtIO（快，半虚拟化总线，需安装驱动）`

产品语义：

- `IDE`：老系统与最大兼容
- `SCSI`：保留，但不是主推荐
- `SATA`：现代兼容默认
- `VirtIO`：性能优先，需要驱动

## UEFI

高级选项新增：

- `UEFI` 左右开关

数据模型建议新增：

- `system.uefi: boolean`

规则：

- 默认 `false`
- `Windows 98` 强制 `false`
- `Windows 10` 默认 `false`
- 第一版仅在 `x86_64` 上正式启用

如果运行时没有找到可用固件：

- 不直接伪造成功
- 启动前明确报错
- 用户提示为“未找到可用的 UEFI 固件”

## 显卡

创建页显卡选项新增或调整为：

- `cirrus-vga`
- `std`
- `qxl`
- `virtio-vga`
- `vmware-svga`

其中：

- `std` 对应当前标准 VGA 路线
- `qxl` 作为兼容备选保留
- `Windows 10` 默认 `std`
- `Windows 98` 默认 `cirrus-vga`

## 网卡

创建页网卡选项扩为：

- `rtl8139`
- `e1000`
- `pcnet`
- `ne2k_pci`
- `virtio-net-pci`

模板默认值：

- `Windows 10`：`rtl8139`
- `Windows 98`：`pcnet`
- `Linux Generic`：`virtio-net-pci`

## 显示与音频规则

## 显示前端

当前创建页里不再让用户选择：

- `Sanaka`
- `SPICE`
- `VNC`

而是直接锁定：

- 显示前端：`Sanaka`

用户界面应表现为：

- 只显示当前正式前端 `Sanaka`
- 不再让用户误以为 `SPICE` 前端已完成

## Sanaka 连接协议

当前 `Sanaka 连接协议` 字段不再提供 `SPICE / VNC` 下拉选择。

正式行为改成：

- 显示内容：`VNC`
- 状态：锁定、只读

如果保留字段，文案应从“可选协议”变成“当前连接协议”。

## SPICE 处理方式

在当前正式产品范围内：

- `SPICE` 不再作为创建页主显示前端选项
- `SPICE` 不再作为 `Sanaka` 后端偏好下拉的一部分
- `SPICE` 可以保留在底层架构或实验能力中，但不再暴露成主流程正式项

## 音频方式

高级选项中的音频方式应从“显示协议附带音频”心智改成“宿主机音频后端”心智。

因此：

- 不再把 `SPICE` 作为主用户向音频方式
- 主文案强调“系统自动 / 宿主机音频”
- 平台相关后端保留：
  - `auto`
  - `pipewire`
  - `pulseaudio`
  - `coreaudio`
  - `directsound`

当前正式说明中不要再暗示：

- `VNC` 自带成熟音频通道
- 或 `SPICE` 是当前必选音频主路线

## 运行时映射规则

## 磁盘总线映射

运行时命令构建需要新增 `sata` 分支。

映射规则：

- `ide` -> `ide-hd`
- `scsi` -> `virtio-scsi-pci + scsi-hd`
- `sata` -> AHCI 控制器 + SATA 盘挂载
- `virtio` -> `virtio-blk-pci`

实现要求：

- `sata` 不能只停留在前端下拉框
- `QemuCommandBuilder` 必须真正生成 SATA 设备参数

## 显示设备映射

运行时需支持：

- `std`
- `qxl`

最低要求：

- `std` 正确映射到标准 VGA 路线
- `qxl` 正确映射到 QXL 设备

## UEFI 运行时

如果 `system.uefi = true`：

- 运行时必须查找并接入可用 UEFI 固件
- 不能只靠 UI 开关假装启用

第一版建议：

- 仅对 `x86_64` 正式支持
- 没有固件时直接报错
- 默认模板都先保持 `false`

## 迁移与兼容

## 模板标签兼容

现有 `template.key = "win11"` 的机器可继续兼容读取。

兼容策略：

- 不强制重写旧 key
- UI 显示使用新 label：`Windows 10`

## 旧磁盘接口

旧配置中已有：

- `ide`
- `scsi`
- `virtio`

全部继续兼容。

新增：

- `sata`

不会影响旧机器打开。

## UI 清理方向

创建页里当前这几项应收掉或改成只读：

- `SPICE` 前端选项
- `VNC` 前端选项
- `Sanaka 连接协议` 下拉框

替换为：

- 显示前端：`Sanaka`
- 连接协议：`VNC`

高级项新增：

- `UEFI` 左右开关

硬件项补充：

- 磁盘总线
- `std / qxl`
- `ne2k_pci`

## 验收标准

- `Windows 10/11` 在 UI 中不再出现，统一显示为 `Windows 10`
- `Windows 10` 新建草稿默认网卡是 `rtl8139`
- `Windows 10` 新建草稿默认磁盘总线是 `sata`
- `Windows 98` 新建草稿默认是：
  - `i386`
  - `128 MiB`
  - `pc`
  - `cirrus-vga`
  - `sb16`
  - `pcnet`
- 磁盘总线下拉框出现 `IDE / SCSI / SATA / VirtIO`
- 显卡下拉框出现 `std`、`qxl`
- 网卡下拉框出现 `ne2k_pci`
- 创建页不再把 `SPICE` 暴露为正式显示前端
- `Sanaka 连接协议` 显示为固定 `VNC`
- 运行时能真实处理 `sata`
- UEFI 开关默认关闭，未接固件时不会伪成功

## 假设

- 当前正式显示路线继续采用 `Sanaka + VNC/noVNC`
- 当前音频主路线采用宿主机音频后端，不依赖浏览器内 VNC 音频
- `Windows 10` 模板以“兼容安装优先”为准，不以 VirtIO 性能优先
- `Windows 98` 模板以“旧系统兼容优先”为准
