# Sanaka 虚拟机创建页面（Machine Builder）重构设计规范

> 这份规范旨在指导 AI 模型如何重新设计和重构 Sanaka 的“创建虚拟机”页面，使其脱离粗糙的 ChatGPT 原型感，具备苹果 macOS (如 UTM) 及主流开发者工具（如 Linear、Raycast）般精密、专业、高质感的桌面工具气质。

---

## 🎨 核心视觉设计原则

### 1. 紧凑的桌面工具化圆角与留白
*   **圆角规范**：禁止使用原有的 `16px`/`20px` 过于圆润的“玩具感”圆角。表单、输入框、常规卡片统一收缩至 **`8px` 或 `10px`**，使边缘挺拔干练。
*   **信息密度**：适当压缩 `padding` 和 `margin`。输入框垂直 Padding 建议在 `10px` 到 `12px` 之间，而不是臃肿的 `14px+`。

### 2. 双栏整齐对齐（Key-Value Grid）
*   常规表单字段（如名称、备注、第一启动方式、架构选择等）采用 **“左标签、右表单”** 的双栏横向排版，或者在栅格系统下保证视觉起点的绝对对齐，避免杂乱的卡片堆叠。

### 3. 精密的聚焦与交互态（Focus & Hover States）
*   **聚焦态**：使用精致的单色聚焦环（如带有 `2px` 扩散的淡紫色 `rgba(146, 121, 200, 0.4)`）。
*   **悬浮态**：鼠标悬浮在卡片（如系统模板、显示前端）上时，应有极为平滑的微移动（`translateY(-1px)`）及微妙的边框/背景色加深，体现微动效。

---

## 🧩 具体组件重构细则

### 1. 虚拟机模板选择器（OS Template Grid）
*   **当前问题**：简单的文字卡片按钮，高亮与常规状态对比单一，缺乏引导性。
*   **重构方案**：
    *   **Bento Grid 布局**：设计一个 3 列或 4 列的微型模板选择网格。
    *   **OS 视觉徽标**：为内建模板（Windows 11, Windows 98, Linux, Custom）提供对应的操作系统图标或色块标识。
    *   **高亮指示**：选中态不仅要改变背景色为 `var(--primary-soft)`，还需在卡片右上角显示一个小圆点勾选状态，并且边框加深。

### 2. 磁盘管理区域（Disks Stack）
*   **当前问题**：磁盘展示行十分粗糙，路径过长，删除键是生硬的 `×` 字符。
*   **重构方案**：
    *   **磁盘条目拟物化**：每个磁盘条目应该有背景卡片，最左侧配备一个存储磁盘（Drive/Storage）的 SVG 图标。
    *   **路径智能截断**：仅突出显示文件名（如 `win11.qcow2`），全路径字号变小并设为灰色（`var(--muted)`）。
    *   **芯片徽章（Chips）**：将总线接口（`virtio`、`ide`）和是否是引导盘（`boot`）用更精致的 StatusChip 标识，背景带轻微透明。
    *   **精美删除图标**：删除按钮使用精致的垃圾桶（Trash）或关闭（Close）SVG 矢量图标，悬浮时变为红色。

### 3. 光盘镜像选择器（ISO Pickers）
*   **当前问题**：一长条文本框与一堆生硬的“选择”、“清除”按钮并排。
*   **重构方案**：
    *   **路径底盘**：将路径显示在带有淡灰色背景、左侧带光驱（Disc）图标的精简卡片内。
    *   **紧凑动作栏**：去除臃肿的二级按钮，替换为利落的图标按钮，或者放在路径条的最右侧作为动作区。

### 4. 显示前端分段控制器（Display Segmented Control）
*   **当前问题**：三个巨大的卡片各占 1/3，十分臃肿。
*   **重构方案**：
    *   **分段式 Tab (Segmented Control)**：对于 (Sanaka / SPICE / VNC) 这种互斥的前端选择，使用类似系统自带的分段滑块或紧凑 Tab 切换。
    *   **微型说明徽章**：在其下方或选项内部，用极其紧凑的徽章提示特点（如：“Sanaka (推荐)”、“VNC (兼容)”）。

### 5. 侧栏摘要与提醒（Sidebar Spec Block & Warnings）
*   **摘要列表**：左对齐 Key，右对齐 Value，排版紧密。每一个规格项（架构、模板、显示协议等）前可以带一个细线条的微型图标，增加工具软件的专业度。
*   **智能警告卡片**：校验警告卡片左侧加上红/黄色的感叹号图标，背景使用柔和的警告底色，字号稍微缩小，强调却不刺眼。

---

## 🛠️ CSS 变量与设计令牌参考 (Styles Specification)

在 `src/styles/app.css` 中需要严格遵循的样式修正：

```css
/* 精密的表单设计令牌 */
:root {
  --radius-form: 8px;              /* 取代原有的 16px */
  --radius-card: 12px;             /* 取代原有的 18px/20px */
  --input-padding: 10px 12px;       /* 更加紧凑 */
  --border-subtle: 1px solid rgba(210, 197, 223, 0.45);
  --focus-ring: 0 0 0 3px rgba(146, 121, 200, 0.22);
}

/* 输入框聚焦修正 */
input:focus,
select:focus,
textarea:focus,
.material-select__anchor:focus-visible,
.material-select__anchor--open {
  border-color: var(--primary-strong) !important;
  box-shadow: var(--focus-ring) !important;
}

/* 拟物化磁盘行样式 */
.disk-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: var(--radius-form);
  border: var(--border-subtle);
  background: var(--panel);
}

.disk-item__icon {
  width: 20px;
  height: 20px;
  color: var(--primary-strong);
}

.disk-item__info {
  flex: 1;
  min-width: 0;
}
```

## 📋 重构实施检查清单与完成状态

- [x] 表单输入控件（`input`、`select`、`textarea`）圆角缩小为 `8px`，去臃肿。
- [x] 模板选择器采用 Bento 网格卡片，右上角增加选中钩子，并包含 OS 图标。
- [x] 磁盘列表使用拟物化行结构，配有存储硬盘图标，删除键替换为 SVG 图标。
- [x] ISO 镜像拾取器整合为左侧光盘图标、右侧紧凑选择/清除的干净长条结构。
- [x] 显示协议选择重构为分段选择器，避免巨幅卡片。
- [x] 侧边栏摘要栏格式调整为经典规格对齐，带有小图标辅助视觉阅读。
- [x] 自定义参数等高级文本域采用等宽字体（`monospace`）。
- [x] 侧边栏左上角 Sanaka Logo 放大（48px），加入精美的海洋 floating/swimming 悬浮动效。
- [x] 最近虚拟机列表图标重构为高档、富有科技感的等角多层虚拟化技术栈（Stacked Virtualization Layers）SVG 矢量图。
- [x] 互斥显示前端选项（Sanaka, SPICE, VNC）重构为带底下物理平滑滑块（Indicator）的 Segmented Control，切换时有非线性弹簧感觉的过渡。
- [x] 设置“显示与音频”大按钮改为真实的交互 Button，增加 hover 轻微位移缩放与 active 点击回弹动效。
- [x] 设置抽屉面板背景、边框、投影支持 300ms cubic-bezier 非线性缓入缓出动画，其内部表单卡片和内容增加 50ms 滞后的渐显和微弱滑入（translateY）效果。
- [x] 侧边栏整体向上延伸到底，将顶层 window 拖动条重构为绝对透明覆盖层（Overlay），完全消除导航栏上方的视觉断层（Gap）。
- [x] 放大最近机器列表中的虚拟机图标，使其高度比例与卡片内容两行文本高度完美平衡对齐（28px）。
- [x] 清理虚拟机创建页面（Machine Builder）顶层标题栏，移除大长串保存路径文字，防止右侧操作按钮产生挤压与杂乱的多行折叠（Wrap）。
- [x] 将默认保存路径以淡灰色 field__hint 提示文字形式重构于“虚拟机名称”输入框下方，布局清爽、逻辑紧密。
- [x] 实现宿主机（Host CPU）与虚拟机（VM Guest）架构的不一致检测警告，若两者架构不符，在系统加速器（Accelerator）下方红字醒目预警用户应选用 TCG 模拟，以防止启动崩溃。
- [x] 将“第一启动方式”选项（默认、光盘、硬盘、软盘）汉化翻译并绑定 i18n 资源文件。
