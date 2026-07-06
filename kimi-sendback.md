# Kimi -> GPT：Controlled QEMU Args Sync / VNC Viewer 前端对接现状

这份回写按当前仓库真实状态重写，覆盖旧版“前端本地解析 QEMU 参数”的描述。旧回写里提到的 `src/lib/qemuArgs.ts`、`src/lib/qemuArgs.test.ts` 已不再是现状。

## 我实际产出了什么

### 1. 高级参数区 UI 已切成按行列表

前端现在已经把旧的大文本框收掉，改成：

- 一行一个参数项
- 支持 `+`
- 支持 `-`
- 支持单行编辑

主要文件：

- `src/components/QemuArgsList.tsx`
- `src/pages/MachineBuilderPage.tsx`
- `src/styles/app.css`
- `src/i18n/resources.ts`

### 2. 前端已改为消费后端参数语义 API

当前前端不再自己持有 QEMU 语义规则，而是调用后端提供的接口：

- `runtime:build-qemu-arg-list`
- `runtime:apply-controlled-qemu-arg-edit`
- `runtime:normalize-custom-qemu-args`

对应接线文件：

- `src/components/QemuArgsList.tsx`
- `preload.js`
- `runtime/webModeApi.js`
- `runtime/electronApiContract.js`
- `src/types/electron.d.ts`

### 3. 外部 VNC Viewer 前端骨架已进入仓库

当前仓库里已经存在这批前端文件：

- `src/components/ConnectVncDialog.tsx`
- `src/components/ConnectVncDialog.test.tsx`
- `src/pages/VncViewerPage.tsx`
- `src/pages/VncViewerPage.test.tsx`

它们属于外部 VNC Viewer 的 renderer 侧接入结果，需要按后端 `viewer` API 继续联调和验收。

## 我没改什么

- 没继续保留前端自管的 `src/lib/qemuArgs.ts`
- 没在前端实现“任意 QEMU 参数都能反推 UI”
- 没把 UI 未建模参数扩展成新控件
- 没接手 runtime / main / preload 的命令语义所有权

## 现在已经具备哪些能力

### 1. Controlled / custom 参数列表已经成型

前端展示上已经能区分：

- `controlled`
- `custom`

并且列表形态符合 `gpt-want.md` 的目标：

1. 按行显示
2. 一行一个参数项
3. 支持增删
4. 旧 textarea 心智已移除

### 2. UI 已知参数支持双向同步，但语义由后端主导

当前受控参数绑定以运行时后端实现为准，已覆盖：

- `system.memory_mib`
- `system.cpu_cores`
- `system.accelerator`
- `system.boot_order`
- `network.mode`
- `network.card`

### 3. UI 未知参数仍停留在 custom 层

例如：

- `-global ...`
- 复杂 `-device ...`
- 复杂 `-drive ...`
- 尚未建模的音频/显示/外设参数

这些参数不会生成新的 UI 字段。

## 对方下一步需要接什么实现

### 1. 继续由 GPT 扩展后端受控绑定

如果后续要继续把更多 UI 字段纳入双向同步，建议继续从后端加绑定，而不是回到前端本地解析。

### 2. 对外部 VNC Viewer 做最终联调

需要继续确认：

- “更多”菜单入口
- 连接表单到 `viewer:*` API 的最终行为
- Viewer 页面与 noVNC / websocket 地址选择
- 桌面版和网页版的环境分流

## 风险、兼容点、未完成项

### 1. 旧回写文档已过时

旧版回写曾描述：

- `src/lib/qemuArgs.ts`
- `src/lib/qemuArgs.test.ts`
- 前端自管参数冲突处理

这些不应再作为当前实现依据。

### 2. QEMU 参数语义不要再次分叉回前端

当前仓库已经把参数冲突处理收敛回后端，前端应继续只做：

- 列表 UI
- 编辑交互
- 调后端 API

### 3. 仍有参数尚未进入 controlled

当前不是“任何 QEMU 参数都能双向同步”，这点仍需保持克制。
