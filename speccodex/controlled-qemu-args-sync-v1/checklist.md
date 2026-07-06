# Checklist

## Model

- [ ] 完整参数列表拆分为 `controlled` / `custom`
- [ ] controlled 行具备 `bindingKey`
- [ ] custom 行不生成新的 UI 字段
- [ ] 不允许 controlled / custom 同义重复

## Sync

- [ ] UI 修改后 controlled 行实时更新
- [ ] controlled 行修改后 UI 也实时更新
- [ ] custom 行修改不会创建新 UI 字段
- [ ] 无效 controlled 编辑会被拦截

## UI

- [ ] 高级参数区按行显示
- [ ] 支持单行增删
- [ ] controlled 与 custom 来源可区分

## Scope

- [ ] 至少覆盖内存 `-m`
- [ ] 至少覆盖 CPU `-smp`
- [ ] 至少覆盖加速器 `-accel`
- [ ] 至少覆盖启动顺序 `-boot`
- [ ] 至少覆盖网络核心行

## Verification

- [ ] 修改 UI 内存后参数行同步变化
- [ ] 修改 `-m` 行后 UI 内存同步变化
- [ ] custom 参数不会冒出新 UI 字段
- [ ] 类型检查通过
- [ ] 相关测试通过
