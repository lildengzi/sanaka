# Settings Runtime Scope

## Goal

收紧设置页的运行默认项边界，避免把单台虚拟机才需要决定的网络和音频后端放到应用级设置里。

## Decisions

- 设置页不提供默认网络模式
- 新建虚拟机的网络模式默认仍为 `User`
- 网络模式只在单台虚拟机配置中设置
- 设置页不提供默认音频方式
- 音频方式移动到单台虚拟机高级选项
- 音频方式默认值为 `auto`，用户界面显示为“系统自动”

## Data Changes

- `AppSettings.runtimeDefaults` 只保留显示相关默认值
- `SakaMachine.advanced.audio_backend` 新增为机器级字段
- `audio_backend` 允许值为 `auto`、`spice`、`pipewire`、`pulseaudio`、`coreaudio`、`directsound`
- `audio_backend = "auto"` 是默认值

## UI Changes

- 设置页 Runtime Defaults 只展示默认显示前端和默认显示协议
- 创建虚拟机页 Advanced 增加“音频方式”
- “音频方式”默认显示“系统自动”
- 普通用户不需要在设置页理解平台音频后端

