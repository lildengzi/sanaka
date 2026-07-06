# Checklist

## Scope

- [ ] 仅 Windows 启用 QEMU 文件路径代理层
- [ ] 不修改 machine 持久化路径字段
- [ ] UI 继续显示用户真实路径
- [ ] 预览命令与真实启动使用同一套代理规则

## Path Resolution

- [ ] 统一定义 `resolveQemuLaunchPath(...)`
- [ ] ASCII 路径默认直通
- [ ] 非 ASCII 路径优先尝试 Windows 短路径
- [ ] 短路径不可用时尝试运行时 ASCII 代理入口
- [ ] 代理失败时存在明确降级路径

## Coverage

- [ ] 磁盘镜像进入代理层
- [ ] ISO 进入代理层
- [ ] floppy 进入代理层
- [ ] firmware code / vars 进入代理层
- [ ] 运行时换盘也复用代理层

## Runtime

- [ ] runtime log 记录代理策略与结果
- [ ] 代理入口命名稳定且仅含 ASCII
- [ ] 不复制大磁盘文件
- [ ] 代理入口清理策略明确

## Verification

- [ ] Windows 非 ASCII 磁盘路径启动可用
- [ ] Windows 纯 ASCII 路径行为不回退
- [ ] 命令预览与实际启动一致
- [ ] 类型检查通过
- [ ] 相关测试通过
