# FK

这次前端回归很低级：

- `MaterialSelect` 明明要求传 `label`
- `SettingsPage` 里却直接漏了
- `tsc` 一跑就炸，属于最基础的调用不对齐

结论：

- 不是组件类型有问题
- 不是构建环境有问题
- 就是调用方改坏了，而且没做最基本的本地检查

以后谁动这块，至少先做三件事：

- 跑 `npm run typecheck`
- 跑 `npm test`
- 看一眼同文件里其他 `MaterialSelect` 的调用方式，别瞎改

一句话总结：

能被 TypeScript 当场抓出来的错误，还能留到你这里，确实离谱。
