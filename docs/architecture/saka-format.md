# Sanaka Machine Format

## 目标

`Sanaka` 当前把机器配置定义为“外层包 + 内部 `TOML` 主配置”的结构。

它的定位是：

- 跨平台
- 可读
- 可手工编辑
- 可版本化
- 可双击打开
- 可作为模板文件或机器定义文件

当前规则分为两类对象：

- 机器包
- 模板文件

机器包的外层命名按平台不同：

- `macOS`：`<MachineName>.saka`
- `Windows/Linux`：`<MachineName>`

机器包内部主配置固定为：

- `machine.svm`

`machine.svm` 本身就是：

- `TOML`
- 机器唯一主配置源
- Windows/Linux 的双击打开入口

机器包内还允许包含：

- `preview.png`

也就是说，当前产品语义已经不是“所有平台都把 `.saka` 当单个文件”，而是：

- `macOS` 用 `.saka` 作为机器包外观
- `Windows/Linux` 用普通目录承载同一套机器包结构
- 内部配置统一由 `machine.svm` 承载

## 标准机器包结构

### macOS

```text
Windows 11.saka/
  machine.svm
  preview.png
```

### Windows / Linux

```text
Windows 11/
  machine.svm
  preview.png
```

规则：

- `machine.svm` 固定命名，不参与用户命名
- `preview.png` 可缺省
- 机器唯一识别继续由 `id` 字段负责
- 旧单文件 `.saka` 只作为导入兼容源，不再作为主写出格式

## 为什么不用 JSON

不使用 JSON 的原因：

- 可读性差
- 手工编辑体验一般
- 注释支持差
- 对这种“工程文件 / 模板文件”不够友好

## 为什么不用 `sque`

不使用 `sque` 作为 `.saka` 主格式的原因：

- 层级结构能力不够强
- 列表和嵌套对象表达不自然
- 后续扩展磁盘、网络、显示、模板继承会变得笨重
- 不利于稳定 schema 和跨平台解析

`sque` 仍然适合：

- 包描述
- 分发清单
- 简单脚本配置

但不适合作为虚拟机工程文件主格式。

## 核心定位

当前规则下，Sanaka 可以承载两类配置对象：

1. 机器定义
2. 模板定义

建议通过 `kind` 字段区分。

## 文件级规则

每个机器主配置文件 `machine.svm` 或模板文件都必须包含：

- `format_version`
- `kind`
- `id`
- `title`

建议包含：

- `created_with`
- `created_at`
- `updated_at`

## 顶层字段

### 必填字段

```toml
format_version = 1
kind = "machine"
id = "win98-dev-001"
title = "Windows 98 SE"
```

字段说明：

- `format_version`
  - 文件格式版本
  - 当前第一版固定为 `1`
- `kind`
  - `machine` 或 `template`
- `id`
  - 文件内稳定标识
  - 用于程序内部引用
- `title`
  - 用户看到的名称

### 推荐字段

```toml
created_with = "Sanaka 0.1"
created_at = "2026-06-02T20:00:00+08:00"
updated_at = "2026-06-02T20:00:00+08:00"
description = "Legacy Windows test machine"
```

## 标准结构

建议第一版采用以下 `machine.svm` 结构：

```toml
format_version = 1
kind = "machine"
id = "win98-dev-001"
title = "Windows 98 SE"
description = "Legacy Windows test machine"
created_with = "Sanaka 0.1"
created_at = "2026-06-02T20:00:00+08:00"
updated_at = "2026-06-02T20:00:00+08:00"

[template]
key = "win98"
label = "Windows 98"

[system]
arch = "i386"
accelerator = "tcg"
boot_order = "cdrom"

[media]
iso = "/path/to/win98.iso"

[[disks]]
id = "disk0"
path = "/path/to/disk01.qcow2"
interface = "ide"
boot = true

[network]
enabled = true
mode = "user"
card = "rtl8139"

[display]
frontend = "sanaka"
gpu = "cirrus-vga"

[peripherals]
usb_tablet = false

[advanced]
audio_backend = "auto"
qemu_args = ""
```

## Section 说明

## `[template]`

用于描述用户选择的系统模板。

```toml
[template]
key = "win98"
label = "Windows 98"
```

字段说明：

- `key`
  - 稳定模板键
- `label`
  - 面向用户显示的模板名

未来可扩展：

- 默认显示前端
- 推荐网卡
- 推荐显卡
- 推荐兼容设置

## `[meta]`

可选的附加元信息。

```toml
[meta]
notes = "Created for driver testing"
tags = ["legacy", "windows"]
```

这一段适合承载不会直接映射到 QEMU 的管理信息。

## `[system]`

用于机器级基础设置。

```toml
[system]
arch = "i386"
accelerator = "tcg"
boot_order = "cdrom"
```

建议字段：

- `arch`
  - 如 `x86_64`、`i386`、`aarch64`
- `accelerator`
  - 如 `tcg`、`hvf`、`kvm`、`whpx`
- `boot_order`
  - 如 `none`、`cdrom`、`disk`、`floppy`

后续可扩展：

- `machine`
- `cpu_model`
- `memory_mb`
- `vcpu_count`

## `[media]`

用于启动介质或附加镜像。

```toml
[media]
iso = "/path/to/win98.iso"
floppy = ""
```

说明：

- `iso`
  - 可为空字符串或省略
- `floppy`
  - 可为空字符串或省略

后续也可扩展为数组模式，但第一版先保持简单。

## `[[disks]]`

磁盘必须使用数组表。

```toml
[[disks]]
id = "disk0"
path = "/path/to/disk01.qcow2"
interface = "ide"
boot = true
readonly = false
```

字段说明：

- `id`
  - 稳定磁盘标识
- `path`
  - 磁盘镜像路径
- `interface`
  - 如 `ide`、`virtio`、`scsi`
- `boot`
  - 是否作为可启动磁盘
- `readonly`
  - 是否只读

后续可扩展：

- `format`
- `cache`
- `discard`
- `snapshot`

## `[network]`

```toml
[network]
enabled = true
mode = "user"
card = "rtl8139"
```

字段说明：

- `enabled`
  - 是否启用网络
- `mode`
  - `user`、`bridge` 等
- `card`
  - 网卡型号，如 `rtl8139`、`virtio-net-pci`

后续可扩展：

- `bridge_name`
- `mac_address`
- `port_forwards`

## `[display]`

这一段很关键，因为它直接对应你说的 `Sanaka / SPICE / VNC`。

```toml
[display]
frontend = "sanaka"
gpu = "cirrus-vga"
```

字段说明：

- `frontend`
  - `sanaka`
  - `spice`
  - `vnc`
- `gpu`
  - 例如 `virtio-vga`、`cirrus-vga`

按前端类型可继续扩展子表。

### `[display.sanaka]`

```toml
[display.sanaka]
scale_mode = "fit"
clipboard = true
fullscreen = false
```

### `[display.spice]`

```toml
[display.spice]
port = 5930
address = "127.0.0.1"
clipboard = true
audio = true
```

### `[display.vnc]`

```toml
[display.vnc]
port = 5901
address = "127.0.0.1"
password = ""
```

这样做的好处是：

- 顶层统一
- 各显示后端单独扩展
- 后续兼容性好

## `[peripherals]`

```toml
[peripherals]
usb_tablet = true
```

第一版只保留已在 UI 里出现的高频项。

后续可扩展：

- `audio_enabled`
- `serial_enabled`
- `usb_redirection`

## `[advanced]`

```toml
[advanced]
audio_backend = "auto"
qemu_args = "-M pc"
```

说明：

- `audio_backend` 表示单台机器的音频后端偏好，默认 `auto`，由运行层按平台自动识别
- 可选值建议为 `auto`、`spice`、`pipewire`、`pulseaudio`、`coreaudio`、`directsound`
- `qemu_args` 是高级逃生口
- 程序层应尽量避免依赖这里承载基础配置

## 模板文件

如果 `kind = "template"`，则含义略有不同。

模板文件描述的是：

- 默认配置
- 推荐显示前端
- 推荐磁盘结构
- 推荐网络与兼容策略

例如：

```toml
format_version = 1
kind = "template"
id = "template-win98"
title = "Windows 98 Template"

[template]
key = "win98"
label = "Windows 98"

[system]
arch = "i386"
accelerator = "tcg"
boot_order = "cdrom"

[display]
frontend = "sanaka"
gpu = "cirrus-vga"

[network]
enabled = true
mode = "user"
card = "rtl8139"
```

## 路径策略

`machine.svm` 中涉及文件路径时，建议支持两种模式：

1. 绝对路径
2. 相对机器包目录的相对路径

建议规则：

- 若路径以 `/`、盘符、或 UNC 开头，则视为绝对路径
- 否则视为相对路径

这有利于模板打包和跨设备迁移。

## 双击打开行为

目标行为：

- `macOS`：双击 `.saka` 机器包后启动 `Sanaka`
- `Windows/Linux`：双击包内 `machine.svm` 后启动 `Sanaka`
- 应用内部统一回推到机器包根路径
- 第一版进入编辑/确认界面，不直接无确认启动虚拟机

## 向后兼容

必须保留：

- `format_version`

未来如果结构变化：

- `Sanaka` 先读版本号
- 再决定升级、迁移或兼容处理

## 设计原则

机器包 / `machine.svm` 第一版设计原则：

- 结构稳定
- 手改友好
- 不追求一次容纳所有 QEMU 参数
- 高级复杂度通过 `advanced.audio_backend` 与 `advanced.qemu_args` 兜底
- 显示前端作为一等概念保留

## 第一版最小必需字段

对 `machine` 来说，第一版建议最少包含：

```toml
format_version = 1
kind = "machine"
id = "example-machine"
title = "Example Machine"

[system]
arch = "x86_64"
accelerator = "tcg"
boot_order = "disk"

[display]
frontend = "sanaka"
gpu = "virtio-vga"
```

注意这里的“最小必需字段”是格式层最小集合，不是产品界面的“最小实现”策略。

## 一句话总结

当前机器格式应当是：

- `macOS` 以 `.saka` 作为机器包外观
- 以 `machine.svm` 作为底层 `TOML` 主配置
- 以“虚拟机工程包 / 模板文件”作为产品语义

这比 JSON 更适合手工编辑，也比 `sque` 更适合长期扩展。
