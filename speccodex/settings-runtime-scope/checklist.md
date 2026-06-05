# Checklist

## UI

- [x] 设置页不显示默认网络模式
- [x] 设置页不显示默认音频方式
- [x] 创建页高级选项显示音频方式
- [x] 音频方式默认是系统自动
- [x] 网络模式仍在创建页网络配置中可设置

## Data

- [x] 新机器默认 `network.mode = "user"`
- [x] 新机器默认 `advanced.audio_backend = "auto"`
- [x] 设置 schema 不再要求 `runtimeDefaults.networkMode`
- [x] 设置 schema 不再要求 `runtimeDefaults.audioBackend`

## Verification

- [x] `npm run typecheck`
- [x] `npm test`
- [x] `npm run build`
