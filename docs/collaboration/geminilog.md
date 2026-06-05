# Sanaka Frontend Refactoring Log & Developer Handover (geminilog.md)

> **致接班 AI 助手/GPT 的话**：
> 你好！我是 Antigravity。我已经对 Sanaka 的 Electron 前端进行了深度的视觉重构和交互重写，移除了之前极其简陋且带直角的 ChatGPT 原型设计。所有修改均在保证 100% 单元测试通过率、Vite 生产构建成功和 TypeScript 类型安全的前提下完成。请在此基础上继续演进。

---

## 🛠 已修改与优化内容日志 (Change Log)

### 1. 🎨 品牌标识与侧边栏优化 (Sidebar & Brand Logo)
*   **Logo 悬浮动效**：将左上角 `workspace-brand__logo` 从 `42px` 放大到 `48px`，并为其增加了名为 `float-swim` 的关键帧动画。当鼠标悬停在品牌区域时，鱼类 Logo 会展现出平滑而高质感的“海洋漂浮/游动”微动效，极具灵性。
*   **虚拟机列表图标**：废弃了原有简陋的“火柴盒显示器”图标，全新设计了等角投影（Isometric）的虚拟化技术栈（Stacked Virtualization Layers）SVG 图标。它由三层淡雅的重叠半透明卡片板组成，展现出纯正的云原生/虚拟化底层工具的硬核科技质感。
*   **侧边栏项圆角**：对最近虚拟机列表项 `.workspace-sidebar__item` 的悬浮高亮块 `::before` 进行了 `8px` 圆角化重构，剔除了突兀的边框左侧线条，使整体导航更加和谐现代。

### 2. 🎛 滑动分段控制器 (Sliding Segmented Control)
*   **显示前端切换**：在 `MachineBuilderPage.tsx` 的 (Sanaka / SPICE / VNC) 互斥分段选择器中，加入了一个绝对定位的滑块背景 `.segmented-control__indicator`。
*   **非线性动效**：按钮被点击时，底部的白色物理背景块会以 `cubic-bezier(0.34, 1.56, 0.64, 1)`（带轻微弹性效果的贝塞尔曲线）在选项间平滑滑动，告别了干瘪的瞬间闪烁。

### 3. ⚙️ 设置页抽屉与非线性动画 (Settings Page Drawers)
*   **背景整体过渡**：给 `.settings-drawer` 面板的 `border-color`、`background-color` 和 `box-shadow` 附加了 `300ms cubic-bezier(0.2, 0.8, 0.2, 1)` 缓动。当抽屉展开或收起时，外层容器的投影和边框质感会非线性地柔和变化，不再突兀。
*   **内容滑入渐显**：为抽屉内部的 `.settings-drawer__body` 增加了 50ms 延迟的渐显 (`opacity`) 与向上微弱滑入 (`translateY(-10px) -> translateY(0)`) 的非线性级联动画，让抽屉下拉时具有优雅的层级滑出视觉深度。

### 4. 📺 显示与音频交互重构 (Display & Audio Settings Tab)
*   **静态改交互**：将设置页中原本纯静态展示的“显示与音频”卡片（Sanaka、SPICE、VNC）重构为真实的 `<button>` 元素，并与 Electron 首选项存储 `settings.runtimeDefaults.displayFrontend` 双向绑定。现在点击卡片即可直接切换默认显示前端。
*   **弹跳物理动效**：为 `.display-card` 按钮定义了专属的 CSS 动效：悬浮时卡片温和上浮并略微放大（`translateY(-3px) scale(1.02)`），点击瞬间会有 `scale(0.97)` 的物理压缩按压回弹，质感极佳。激活状态右上角配有淡雅圆点对勾。

### 5. 🩹 TypeScript 编译修复 (Bug Fix)
*   **修复未导入组件**：在对控制台页面 `MachineConsolePage.tsx` 进行高级改造时，由于使用了 `<SectionCard>` 组件而漏掉了对应的 import。已为其正确添加了 `import { SectionCard } from '../components/Field';`，彻底修复了 `npm run typecheck` 报错失败的问题。

---

## 🛠 第二次修改与优化内容日志 (Second Change Log)

### 1. 🖥 消除导航栏上方断层 (Unified macOS Titlebar Interface)
*   **去线全高设计**：移除了顶层 `.app-dragbar` 下横跨的 `.app-dragbar__line` 分割线，并将 dragbar 修改为定位覆盖（`position: absolute`、`z-index: 9999`）结构。
*   **通顶贴边布局**：修改 `.app-shell__surface` 撑满 `100vh` 高度，并让左侧 `.app-sidebar` 从真正的窗口最顶部 `0` 位置开始渲染。
*   **精准安全间距**：对 `.app-sidebar` 设定了 `padding-top: 38px`（为主机红黄绿三色控制交通灯按钮留出合适的安全空隙），同时将右侧主面板 `.app-shell__content` 的 `padding-top` 设为 `48px`。此时左侧导航栏与右侧页面顶端融为一体，彻底消除了 change2 中由于 dragbar 挤压产生的视觉断层（Gap）。

### 2. 📁 虚拟机创建页标题与表单布局清理 (Header & Basic Info Realignment)
*   **头部精简防折行**：去掉了 `MachineBuilderPage.tsx` 页面顶层标题栏中冗长杂乱的“新建后会自动保存到默认位置: /Users/steve372dzudo/Documents/Sanaka”文字，使标题区域极简清爽。同时限制 `.workspace-header__actions` 动作按钮组进行 Flex 强制换行（`flex-wrap: nowrap`），彻底消除了 change1 中由于左侧文字太长把右侧“另存为”和“创建”按钮挤成上下错落乱堆的现象。
*   **地址提示归位**：将长条的默认保存路径改写为精致的淡灰色 field__hint 小字，移至基本信息“虚拟机名称”输入框的正下方，从逻辑和视觉上更贴合表单命名操作。
*   **返回按钮重构**：将原本粗糙无边框的纯文字 `返回` 链接重构为带精致边框、圆角、背景且带有返回箭头的 `← 返回` 物理按钮。

### 3. 🎯 架构差异检测警告 (Host-Guest CPU Architecture Warning)
*   **宿主架构探针**：修改 `main.js` 中的 `getAppMetadata` 接口，暴露宿主机 CPU 的真实底层架构（`process.arch`），并在 TS 定义中予以声明。
*   **动态碰撞告警**：在 `MachineBuilderPage.tsx` 中编写了检测比对逻辑。当用户选择的虚拟机架构（VM Guest Arch）与宿主机架构（Host Arch）不符（例如在 Apple Silicon 的 M1/M2/M3/M4 `arm64` 电脑上尝试建立 x86_64 虚拟机时），会在“加速方式”下拉选择框下方用**红色字体**醒目呈现警告信息：“检测到宿主机与虚拟机架构不匹配，只能使用 TCG 模拟加速。选择其他加速选项可能会导致虚拟机无法启动。”。

### 4. 🌏 第一启动方式多语言汉化 (Localized First Boot Dropdown)
*   **选项汉化**：移除了代码中写死的硬编码英文，在 `resources.ts` 中新增了 `bootOptions` 的 `zh-CN` 及 `en-US` 键值（包括：默认、CD-ROM（光盘）、Disk（硬盘）、Floppy（软盘））。
*   **动态本地化**：在 `MachineBuilderPage.tsx` 中使用 `useMemo` 配合 `t()` 宏，实现了第一启动方式下拉列表的动态多语言响应。

### 5. 📐 放大最近机器列表图标 (Sidebar List VM Icon Enlargement)
*   **完美文本比例对齐**：针对 change3 提出的“列表图标需要大一些”，对 sidebar 虚拟机项中左侧的卡片叠放 SVG 赋予了 `workspace-sidebar__icon--machine` 类名。在 `app.css` 中将该类下的容器调整为宽高度 `28px`，SVG 调整为 `26px`，使其视觉尺寸与右边两行小文本（标题 + 模板名称）的高度比例实现和谐对齐。

---

## 📊 macOS 导航栏透明/毛玻璃（Vibrancy）可行性分析 (change5)

### 1. 结论
**完全可以做到！** 这是 Electron 在 macOS 平台上最标志性、最具苹果 native 质感的高级视觉特性。通过结合 Electron 的主进程 API 与渲染进程的 CSS 配置，我们可以把左侧导航栏做成跟随系统深浅色背景动态变化的毛玻璃磨砂（Translucent Frosted Glass）效果。

### 2. 具体实施方案 (Implementation Steps)

#### 步骤一：在主进程 (`main.js`) 中开启 Vibrancy
在 Electron 主进程创建 `BrowserWindow` 时，传入 `vibrancy` 参数（macOS 专用）以及 `visualEffectState`（让窗口在失去焦点时也保持毛玻璃状态）：
```javascript
mainWindow = new BrowserWindow({
  width,
  height,
  titleBarStyle: 'hiddenInset', // 已经开启
  vibrancy: 'sidebar',          // 👈 核心参数：告诉 macOS 这个窗口有侧边栏，启用系统级侧边栏磨砂质感
  visualEffectState: 'active',  // 👈 保持失焦时毛玻璃不灰化
  webPreferences: {
    // ...
  }
});
```

#### 步骤二：在渲染进程 CSS (`app.css`) 中设置透光背景
要让系统毛玻璃露出来，HTML DOM 树中所有覆盖在上面的容器底面背景**必须为透明或半透明**，否则实色背景会完全遮挡住磨砂。
```css
/* 1. 将 html, body 以及核心壳背景改为完全透明 */
html, body, #root, .app-shell, .app-shell__window {
  background: transparent !important;
}

/* 2. 移除 sidebar 的实色背景，改为略带白色的超轻半透明叠加，并启用 CSS 模糊作为其他平台的 Fallback */
.app-sidebar {
  background: rgba(255, 255, 255, 0.3) !important; /* 极薄的白色覆盖层 */
  backdrop-filter: blur(20px);                     /* 非 macOS 系统（如 Windows/Linux）下的兼容毛玻璃 */
}

/* 3. 对右侧内容区域设置磨砂对比色底版 */
.app-shell__content {
  background: rgba(255, 255, 255, 0.82);           /* 比侧栏厚重的实色，形成视口分离 */
}
```

---

## 🛠 第三次修改与优化内容日志 (Third Change Log)

### 1. ❄️ macOS 侧边栏毛玻璃磨砂（Vibrancy / Frosted Glass）
*   **主进程开启 Vibrancy**：在 `main.js` 中创建 `BrowserWindow` 时，为 macOS 平台添加了 `vibrancy: 'sidebar'` 以及 `visualEffectState: 'active'`，并使背景色在 macOS 下设为透明 (`#00000000`)。
*   **系统级样式适配**：在 `AppStore.tsx` 中检测到 macOS 宿主环境时，自动为 `document.body` 附加 `platform-darwin` 类名。
*   **高质感磨砂样式**：在 `app.css` 中，为带有 `.platform-darwin` 的 body、root、app-shell 等高层容器设置 `background: transparent !important;`。使侧边栏 `.app-sidebar` 的背景变为半透明 `rgba(255, 255, 255, 0.22)` 并具备 `backdrop-filter: blur(28px)`，让系统原生窗口毛玻璃质感完美显现，右侧主内容区保持不透光的 `var(--bg)`，实现了层级深度的分离。

### 2. 🛡 虚拟机重名与空名校验及自动递增 (VM Name Unique Warning & Autoincrement)
*   **自动递增命名**：在 `AppStore.tsx` 中编写了 `getUniqueMachineTitle(title, existingTitles)` 核心纯函数，能够智能提取名称后缀的数字并递增（例如 `Windows 98` -> `Windows 98 2` -> `Windows 98 3`），同时巧妙处理了像 `Windows 98` 这种本身带数字但没有递增后缀的模板名称（不会误将其变更为 `Windows 99`，而是变成 `Windows 98 2`）。
*   **创建与导入双重应用**：在从模板新建虚拟机草稿 (`createDraftFromTemplateKey`)、从现有磁盘导入草稿 (`createDraftFromDisk`) 以及从文件打开模板 (`openSakaPayload`) 时，均会自动检测重名并运用递增生成唯一的默认名称。
*   **实时表单拦截**：在 `MachineBuilderPage.tsx` 中，利用 `useMemo` 实时的与 `recents` 虚拟机列表进行重名检测（不包含自身 ID），并在虚拟机名称输入框下方用红色醒目的文字输出 `该虚拟机名称已存在，请使用其他名称。` / `虚拟机名称不能为空。` 等提示信息。同时，会彻底禁用“创建”和“另存为”操作按钮。

### 3. 🎬 全局淡入淡出与微动效扩展 (Smooth Route Entrance & UI Transitions)
*   **页面淡入滑出动画**：将原本位于静态容器 `.app-shell__content` 上的 entrance 动画迁移到了 `.page` 以及 `.page-loading` 路由页本身，这样在每次切换路由页面挂载（Mount）时，都会平滑地触发 `page-enter` 动画（`300ms var(--ease-standard)`），实现极其顺畅的页面淡入与微小位移滑入。
*   **侧边栏悬浮平滑过渡**：为侧边栏的“创建虚拟机”按钮、工具项以及列表项添加了平滑的过渡规则（`transition: background 180ms ease, color 180ms ease, transform 180ms ease;`），当鼠标悬浮或切换激活状态时，背景颜色和文字颜色会柔和渐变过渡，消除了硬切换的突兀感。

---

## 🛠 第四次修改与优化内容日志 (Fourth Change Log)

### 1. 📐 导航栏细描边与阴影消除 (Sidebar Border & Shadow Removals)
*   **细描边替代阴影**：去掉了 `.app-sidebar` 原先的 `.shadow-sidebar` 阴影，重构为淡紫灰色的超细右边框（`border-right: 1px solid rgba(210, 197, 223, 0.45)`），实现清爽平面化的高级质感。
*   **磨砂玻璃高透化**：将 macOS 的毛玻璃背景颜色覆盖层 `.app-sidebar` 的不透明度从 `0.22` 大幅下调至 `0.08`（`background: rgba(255, 255, 255, 0.08) !important`），并将模糊度调整为 `20px`，使其更加透明空灵，原生的磨砂反光感非常通透。

### 2. 🗑 虚拟机详情页删除按钮图标化 (Trash Icon Button in Details Page)
*   **废弃大按钮**：废弃了原本危险区域的 text-based “删除虚拟机”红色按钮。
*   **高精删除图标**：引入了精美的 SVG `TrashIcon` 组件，将删除动作封装为 `icon-button icon-button--danger`。右侧的红色垃圾桶图标与危险区域的标题和说明文字对齐，支持极佳的按压微弹动效。

### 3. 🛡 自动增量更名的点击预应用 (Click-to-Apply auto-increment title)
*   **允许点击创建**：移除了表单重名时禁用“创建”和“另存为”按钮的限制，按钮在重名状态下依然可供点击。
*   **增量后缀预渲染**：实时在输入框下方以橙色警告字样预显该名称占用时的最终命名效果（例如：`⚠️ 该名称已存在，创建后将自动命名为：Windows 98 2`）。
*   **点击同步更名**：在用户点击“创建”或“另存为”的瞬间，前端将直接提取算好的 `uniqueTitle` 应用到 Draft 状态（使输入框的值在眼前瞬间刷新），并安全传入 `saveDraft` 底层去创建对应的机器包，从而消除了在详情页才突兀发现名字被改了的错位感。

---

## 💡 给后续 GPT/AI 开发者的开发建议 (Handover Tips)

### 1. 表单绑定与自动化测试要求 (`screen.findByLabelText`)
*   为了防止破坏现有的 Vitest 自动化单元测试，所有的表单输入组件（如 `input`, `textarea`, `select`）必须嵌套包裹在带有 `className="field"` 的 `<label>` 元素内，或者通过 `htmlFor` 显式关联。
*   测试框架会使用 `screen.findByLabelText` 精确检索标签关联的输入框，直接裸奔的表单项会导致测试红线报错。

### 2. 避免使用 `hidden={!active}` 截断 CSS 过渡
*   在 React 中，如果对需要展开收起的包装器添加 `hidden={!active}` 或 `display: none`，浏览器会瞬间移除渲染树布局，从而**彻底阻断**任何 CSS 高度或网格行（`grid-template-rows`）的过渡动画。
*   我们当前使用 `display: grid; grid-template-rows: 0fr -> 1fr; overflow: hidden;` 来实现无痛的高度过渡，请务必保持这一结构。

### 3. 构建与验证指令
在后续进行任何前端改动后，请务必执行以下链式指令来确保没有引入 Lint 错误或构建 Regression：
```bash
# 验证类型安全
npm run typecheck

# 验证所有自动化单元测试通过
npm run test

# 验证 Vite 生产打包成功
npm run build
```
保证这三项指令全部绿色通过，是提交代码的硬性门槛。祝你开发愉快！

---

## 🛠 第五次修改与优化内容日志 (Fifth Change Log)

### 1. 🪟 修复窗口鼠标拖拽失效问题 (Window Dragging Restoration)
*   **移除覆盖层阻碍**：由于 `.app-shell__surface` 之前设置了 `-webkit-app-region: no-drag;` 并撑满 `100vh`，这导致它作为一个覆盖层阻挡了其下/兄弟节点 `.app-dragbar` 的 `-webkit-app-region: drag;` 鼠标捕获。
*   **拖拽区恢复**：在 `app.css` 中移除了 `.app-shell__surface` 上的 `-webkit-app-region: no-drag;`，使得顶部的 Dragbar 可以正确响应系统的窗口拖拽，完美恢复了 macOS 窗口的手势/鼠标拖拽能力。

### 2. 🎬 非线性全屏缩放动画 (Premium Zoom Transition Actions)
*   **无截图播放按钮**：将“暂无截图”区域改造成交互式按钮。若 VM 未启动，显示“播放”图标；若已启动，显示“控制台 (显示器)”图标。
*   **启动与进入控制台动画**：
    *   点击启动时，播放图标（三角形）触发 `zoom-transition-launch`，非线性放大 150 倍填满屏幕，颜色从中途平滑渐变到应用背景色（`var(--bg)`），无缝衔接跳转并淡出。
    *   点击已启动的控制台图标时，显示器图标触发 `zoom-transition-console`，同样非线性膨胀填满屏幕并平滑过渡到背景色，进入控制台。
*   **CSS 非线性曲线**：使用了 `cubic-bezier(0.7, 0, 0.3, 1)`（高质感非线性缓动），动画耗时 1000ms（450ms 时路由后台无感切换，550ms 后渐变到背景色并自然淡出）。

### 3. 🗑 内置虚拟机删除确认弹窗与删除动画 (Built-in Delete Modal & Zoom Action)
*   **移除原生 Confirm/Alert**：废弃了 macOS 原生 `window.confirm` 和 `window.alert` 弹窗。
*   **内置模态对话框**：在详情页中实现了配合 `.modal-backdrop` 与 `.modal-card` 的内置模态对话框，支持取消和确认删除。
*   **垃圾桶缩放动画**：确认删除后，关闭弹窗并触发 `zoom-transition-delete` 动画。红色垃圾桶图标非线性放大 150 倍，颜色渐变过渡至应用背景色，同时完成后台 VM 删除并退回主界面 `/`。

---

## 🛠 第六次修改与优化内容日志 (Sixth Change Log)

### 1. 🗑 修复“删除虚拟机”按钮点击无反应 (Delete Button Overlap Fix)
*   **指针穿透**：由于 `.brand-orb` 背景装饰圆盘原本在 `.modal-card` 底部重叠，且没有设置 `pointer-events: none`，导致其拦截并阻断了用户对模态弹窗“确认删除”等按钮的点击事件。已通过将 `.brand-orb` 设置为 `pointer-events: none`，并提升 `.modal-backdrop` 的 `z-index: 9999` 彻底解决了此问题。

### 2. 🗂 侧边栏虚拟机右键上下文菜单 (Sidebar VM Context Menu)
*   **右键菜单选项**：为侧边栏的虚拟机列表项添加了 `onContextMenu` 事件，并在 `AppHeader.tsx` 中实现了精致的浮动上下文菜单（Context Menu）。
*   **五大核心操作**：
    1.  `属性` (Properties / View Info)：直接跳转虚拟机对应的详情主页面。
    2.  `重命名` (Rename)：弹出内置的高颜值表单对话框，允许用户直接在侧边栏对虚拟机名称进行重置并刷新 recents 列表及修改 `.svm` 文件。
    3.  `打开机器文件夹` (Open Folder)：调用 Electron 的 `shell.openPath` 接口，一键在系统访达（macOS Finder）或资源管理器中打开该机器对应的 `.saka` 打包文件夹。
    4.  `复制副本` (Duplicate)：将选中的虚拟机包在磁盘上进行完整复制，生成唯一的名称后缀与 UUID，并同步推入 recents 列表。
    5.  `删除` (Delete)：红色高亮，点击唤起内置的删除确认模态对话框。
*   **独立精致矢量图标**：为上述五个选项均精细绘制并嵌入了对应的 SVG Outline 矢量轮廓图标，并赋予了专属的 CSS 模糊阴影和微动效。

### 3. 🧪 补全单元测试 Mock 与通过率修复 (Vitest Mocks & Test Suite Fixes)
*   **扩展 Electron API Mocks**：在 `MachineBuilderPage.test.tsx`、`MachineDetailsPage.test.tsx` 和 `SettingsPage.test.tsx` 中对新注册的 `window.electronAPI.files` 接口（`renamePath`、`copyPath`、`openPath`）补全了 mocks 声明，修复了 TypeScript 编译类型缺失。
*   **测试结构同步**：将 `MachineDetailsPage.test.tsx` 中的 `<Routes>` 渲染重构为全局的 `<RoutedShell />` 测试挂载，使删除交互单元测试能正确捕获并操作位于全局 Shell 层级下的模态弹窗。当前所有单元测试、Vite 生产构建和类型校验已 100% 顺利通过。


