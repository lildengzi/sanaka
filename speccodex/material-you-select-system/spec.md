# Material You Select System

## Goal

把 Sanaka 前端中的选择框统一为一个模块化 `MaterialSelect` 系统，避免同一应用里同时出现系统原生下拉层和自定义 Material You 菜单。

## Scope

- 覆盖创建虚拟机页的全部选择框
- 覆盖设置页的全部选择框
- 覆盖模板管理行内的默认显示前端选择框
- 不改变任何领域值、配置保存结构或 Electron IPC
- 不把文本输入框、按钮组、模板卡片误改成 select

## Component Contract

统一组件：

- `MaterialSelect`
- `MaterialSelectField`

`MaterialSelect` 用于行内、紧凑或自定义布局场景。

`MaterialSelectField` 用于标准表单字段场景，结构固定为：

- label
- select anchor
- optional hint

## Visual Requirements

- 使用淡紫 tonal surface
- 不使用渐变
- 菜单锚定触发器展开
- 菜单是临时 elevated surface
- 圆角克制，不做夸张浮层
- 选中项显示勾选符号
- 当前 hover / keyboard active 项有浅紫状态层

## Motion Requirements

- 打开：短时淡入 + 轻微下移复位
- 关闭：短时淡出 + 轻微上移
- 动画保持在 `140-160ms`
- 尊重 `prefers-reduced-motion`

## Interaction Requirements

- 点击触发器打开或关闭
- 点击菜单外部关闭
- `ArrowUp` / `ArrowDown` 移动当前选项
- `Enter` / `Space` 选择当前选项
- `Escape` 关闭菜单
- `Tab` 离开时关闭菜单

## Accessibility Requirements

- 触发器暴露 `aria-haspopup="listbox"` 和 `aria-expanded`
- 菜单使用 `role="listbox"`
- 选项使用 `role="option"` 和 `aria-selected`
- 紧凑场景必须提供 `aria-label`
- 标准表单场景必须保留可见 label
- 焦点状态必须清晰可见

