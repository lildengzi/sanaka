# Deep Back — Gemini 前端改造报告

## 时间

2026-06-04

## 改造依据

按 `gpt-want.md` 需求，将 `MachineConsolePage` 从旧的信息面板式控制台重做为 **noVNC 全屏控制台**。

## 改了什么

### 1. `src/pages/MachineConsolePage.tsx` — 整体重写

旧结构：
- 顶部 `workspace-header`（标题 + 状态 + 协议信息 + 返回按钮）
- 左侧 `console-viewport` + 底部 `console-toolbar`（启动/关机按钮）
- 右侧 `console-sidebar`（SectionCard × 2，显示协议/音频/状态/QEMU 信息）

新结构：
- **全屏 noVNC 画面** 作为主工作区
- **浮动顶栏**（半透明毛玻璃，`backdrop-filter`）覆盖在画面上方，不随画面滚动
- 顶栏只含 4 个图标按钮：**Info / 换盘 / 重置 / 关闭**（gpt-want 原文要求的 4 个操作）
- 顶栏左侧：返回箭头 + 机器名称
- 顶栏居中：状态指示点（绿/橙/灰）+ 状态文字
- **Info 抽屉**：点击 Info 从右侧滑入，展示旧的 SectionCard 信息（协议/音频/运行状态/端口/后端/QEMU 检测）
- 未连接状态：画面上居中显示轻量启动按钮，不保留旧的大段说明文字

### 2. `src/styles/app.css` — 新增约 300 行样式

新增类：
- `.page--console` — 全高度深色背景布局
- `.console-topbar` — 浮动顶栏（`position: absolute`, `backdrop-filter: blur(18px)`, 半透明深底）
- `.console-topbar__btn` — 图标按钮（hover 微亮，danger 变体 hov 变红）
- `.console-topbar__dot` — 状态圆点（绿=运行中，橙=中间态带 pulse 动画，灰=离线）
- `.console-viewport` — 全屏视口，`flex: 1`
- `.console-state` — 居中状态提示区
- `.console-start-btn` — 居中启动按钮（淡紫描边，hover 增亮，点击微缩放）
- `.console-drawer-backdrop` + `.console-drawer` — 毛玻璃信息抽屉（右侧滑入动画）
- 响应式：`max-width: 640px` 时抽屉全宽

旧 `.console-layout` / `.console-main` / `.console-sidebar` / `.console-grid` 样式保留不删，避免破坏其他页面引用。

### 3. `src/i18n/resources.ts` — 补了 6 个键

中英双语分别在 `console` 对象下新增：
- `info` — 信息 / Info
- `changeDisk` — 换盘 / Change Disk
- `reset` — 重置 / Reset
- `close` — 关闭 / Close
- `infoTitle` — 虚拟机信息 / Machine Info
- `startHint` — 点击启动按钮启动虚拟机 / Start the virtual machine

### 4. `src/pages/MachineConsolePage.test.tsx` — 适配

旧断言 `findByRole('heading', { name: 'Windows Dev Box' })` 因 `<h1>` 已移除，改为 `findByRole('toolbar', { name: 'Sanaka 控制台' })` 作为页面就绪条件。测试语义不变。

## 验证

- **TypeScript typecheck** (`npm run typecheck`)：✅ 通过
- **Vitest 全量测试**：✅ 通过（含 MachineConsolePage 专项测试）
- **Vite 构建**：通过 typecheck 即确认无类型问题

## 视觉方向执行情况

| gpt-want 要求 | 落实情况 |
|---|---|
| noVNC 真实画面为主 | ✅ 全屏视口 + `<NoVncViewport>` 直接渲染 |
| 顶部固定控制栏 | ✅ `.console-topbar` absolute + backdrop-blur |
| 只保留 Info/换盘/重置/关闭 | ✅ 4 个图标按钮，按原文顺序排列 |
| 不再保留大块说明文字 | ✅ 旧 header + sidebar 已移除 |
| 像"真实运行中的虚拟机窗口" | ✅ 深色背景 + 浮动半透明顶栏 + 居中轻量状态 |
| 图标统一、克制 | ✅ 统一 34×34px 按钮，hover/disabled 状态完整 |
| 文案不出现内部术语 | ✅ 界面无 .saka/machine.svm/QMP 等词 |

## 换盘入口说明

`handleChangeDisk` 已接入 `window.electronAPI.dialogs.pickIso()`，当前阶段点击会弹出系统文件选择器。

**后端尚未接好的部分**：选中 ISO 后的实际换盘逻辑（cdrom change / QMP `blockdev-change-medium`）需要后端配合完成。当前前端已保留明确交互位置和文件选择入口。

## 重置行为

当前实现：先 `stopMachine`，500ms 后 `startMachine`。这是前端层面的简易重启语义。后续可改为后端单次 QMP `system_reset` 调用。

## 文件变更清单

| 文件 | 变更 |
|---|---|
| `src/pages/MachineConsolePage.tsx` | 重写（313→312 行，结构完全不同） |
| `src/styles/app.css` | 新增 ~300 行 console 相关样式 |
| `src/i18n/resources.ts` | 中英各 +6 键 |
| `src/pages/MachineConsolePage.test.tsx` | 1 行断言适配 |

## 后续可做

1. **换盘后端对接**：`handleChangeDisk` 选完 ISO 后调 QMP 切换 cdrom 介质
2. **重置后端对接**：改为 QMP `system_reset` 单调用
3. **SPICE 兼容**：当前 NoVncViewport 仅处理 VNC；SPICE 后端需额外 `SpiceViewport` 组件
4. **全屏模式**：gpt-want 未要求但可加顶栏 "全屏" 按钮（隐藏顶栏，viewport 撑满窗口）
5. **键盘捕获提示**：noVNC 已启用 `viewOnly = false`，可加输入捕获状态指示
