# Sanaka 新版本提醒 v1 Spec

## 背景

Sanaka 现在需要一个“新版本提醒”能力，但当前阶段不做自动更新，不做后台下载安装，也不做 nightly 这种复杂通道。

当前目标非常明确：

- 应用能知道远程是否有新版本
- 用户能在应用内看到新版本号和更新内容
- 用户可以手动前往下载
- 用户可以跳过当前这个版本

这轮重点是“提醒”和“说明”，不是“更新器”。

## 目标

第一版固定实现这些能力：

- 启动后静默检查一次更新
- 应用运行期间每 8 小时主动检查一次更新
- 设置页支持手动检查更新
- 如果有新版本，弹出更新提醒
- 更新提醒里能看到版本号、发布时间、更新标题、更新内容
- 更新内容很多时，内容区可以滚动
- 用户可以选择：
  - 前往下载
  - 稍后
  - 跳过此版本

## 非目标

- 不做自动下载
- 不做自动安装
- 不做增量更新
- 不做 nightly 通道
- 不让普通用户在设置里切换更新通道
- 不暴露 TOML、远程清单、metadata 这类内部术语

## 更新源格式

第一版更新源使用远程 TOML 文件。

建议文件名：

```text
update.toml
```

推荐结构：

```toml
version = "0.0.2"
channel = "beta"
mandatory = false
pub_date = "2026-06-05"
url = "https://github.com/steve372a/sanaka/releases/tag/v0.0.2"
title = "0.0.2 Beta 更新"

notes = """
更新了若干内容
修复了 Windows 顶部点击区域
优化了 macOS 包行为
"""
```

字段说明：

- `version`
  - 远程版本号
- `channel`
  - 该版本所属通道，只支持 `release` 和 `beta`
- `mandatory`
  - 是否属于强提醒更新
  - 第一版保留字段，但默认只按普通提醒处理
- `pub_date`
  - 发布时间，供 UI 展示
- `url`
  - 用户点击“前往下载”后打开的页面
- `title`
  - 更新标题，可选
- `notes`
  - 更新说明正文，多行文本

## 通道规则

第一版只支持两个通道：

- `release`
- `beta`

当前应用本地通道不让用户手动选择，而是由当前版本号推导：

- 当前版本字符串包含 `beta`，则本地通道为 `beta`
- 否则本地通道为 `release`

更新比较规则固定为：

- 本地 `release`
  - 只接收远程 `release`
- 本地 `beta`
  - 接收远程 `beta`
  - 也接收远程 `release`

这条规则的目的很简单：

- 正式版用户不看测试版
- 测试版用户能继续收到测试版，也能提前收到正式版

## 版本比较规则

第一版必须解决两个实际问题：

1. 比较远程版本和本地版本时，不能只做字符串字典序比较
2. 展示版本号和内部版本号可以不同，但比较逻辑必须稳定

建议规则：

- 本地内部版本格式继续用可比较格式，例如 `0.0.1-beta`
- UI 展示时可以继续显示 `0.0.1 (beta)`
- 远程 `version` 使用和内部一致的格式

后端负责版本比较，不把这部分逻辑丢给前端。

## 产品行为

### 1. 启动后静默检查 + 定时主动检查

- 应用启动完成后静默检查一次远程更新
- 不要阻塞启动
- 不要一上来就打断用户
- 可以在启动后短延迟执行，例如 3-5 秒后
- 应用继续运行时，每 8 小时主动检查一次
- 主动检查到新版本后，直接提醒用户
- 不是只等用户自己进入设置页才看到

如果有新版本，并且没有被用户跳过，则弹出更新提醒。

### 2. 设置页手动检查

设置页显示：

- 当前版本
- 当前通道
- 检查更新按钮

手动检查结果：

- 有更新：弹更新提醒
- 已是最新：轻提示
- 检查失败：轻提示

### 3. 更新提醒弹层

弹层信息结构固定为：

- 标题：发现新版本 `x.x.x`
- 可选副标题：`title`
- 发布时间：`pub_date`
- 更新内容：`notes`

按钮固定为：

- `前往下载`
- `稍后`
- `跳过此版本`

行为：

- `前往下载`
  - 使用默认浏览器打开 `url`
- `稍后`
  - 只关闭这次提醒
- `跳过此版本`
  - 记录当前远程版本
  - 同版本以后不再提醒

### 4. 长内容滚动

如果 `notes` 很长：

- 弹层内容区独立滚动
- 头部不滚
- 按钮区不滚
- 不允许整块弹层无限长

## 跳过此版本规则

第一版不做“永不提醒”，只做“跳过此版本”。

本地设置中记录：

```ts
skippedVersion?: string
```

规则：

- 如果远程版本等于 `skippedVersion`，则不弹提醒
- 如果远程版本比 `skippedVersion` 更高，则重新允许提醒

例如：

- 用户跳过 `0.0.2`
- 之后 `0.0.2` 不再提醒
- `0.0.3` 仍会提醒

## 后端职责

后端负责：

- 下载远程 `update.toml`
- 解析 TOML
- 推导本地更新通道
- 比较版本
- 过滤通道
- 记录和读取 `skippedVersion`
- 在需要时用默认浏览器打开下载页面

建议接口：

```ts
electronAPI.updater.getCurrentInfo()
electronAPI.updater.checkForUpdates({ silent?: boolean })
electronAPI.updater.skipVersion(version)
electronAPI.updater.openUpdatePage(url)
electronAPI.updater.onUpdateAvailable(handler)
```

建议返回结构：

```ts
type UpdateChannel = 'release' | 'beta';

interface UpdateManifest {
  version: string;
  channel: UpdateChannel;
  mandatory: boolean;
  pubDate?: string;
  url: string;
  title?: string;
  notes: string;
}

interface UpdateCheckResult {
  currentVersion: string;
  currentChannel: UpdateChannel;
  latest?: UpdateManifest;
  hasUpdate: boolean;
  skippedVersion?: string;
  error?: string;
}
```

## 前端职责

前端只负责：

- 设置页“更新”区块
- 更新提醒弹层
- 展示检查状态
- 调后端接口

前端不负责：

- 版本比较
- 通道判断
- 解析远程 TOML

## 动画与交互要求

更新提醒弹层必须避免之前出现过的“淡入无动画”问题。

明确要求：

- 初次打开时要真实发生 enter 动画
- 不能一挂载就直接落到最终 visible 态
- 不能依赖鼠标移动触发显示
- 不能闪
- 关闭时正常淡出

动效整体要轻，不夸张。

## 文案要求

对用户只使用用户向文案：

- 新版本提醒
- 检查更新
- 前往下载
- 跳过此版本

不要显示：

- update.toml
- manifest
- metadata
- channel fallback
- remote config

## 验收标准

- 应用启动后可以静默检查更新
- 设置页可以手动检查更新
- 有更新时会显示新版本提醒
- 提醒中能看到版本号、发布时间和更新内容
- 更新内容很多时内容区可滚动
- 点击前往下载会打开默认浏览器
- 点击稍后只关闭本次提醒
- 点击跳过此版本后，同版本不再弹
- 新版本高于被跳过版本时，提醒恢复
- release 只看 release
- beta 看 beta 和 release
- 弹层进入时有真实淡入，不会闪，不会鼠标动了才出现
