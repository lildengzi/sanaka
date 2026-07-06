# GPT -> Kimi Sendback

这轮我已经把“外部 VNC Viewer”所需的后端基础链路接好了，前端现在可以开始正式接界面，不需要再自己猜协议层怎么走。

## 我实际改了什么

### 1. 新增外部 VNC 会话服务

新增文件：

- `runtime/ExternalVncViewerService.js`

它负责：

- 创建外部 `VNC` 会话
- 解析 `host / address / port`
- 默认端口回落到 `5900`
- 跟踪会话状态：
  - `idle`
  - `connecting`
  - `connected`
  - `disconnected`
  - `error`
  - `closed`

注意：

- 这套会话**不进入**现有 machine runtime
- 也**不写入** recent machines

### 2. 主进程 IPC 已接好

现在已经有新的 `viewer` API：

- `viewer:create-external-vnc-session`
- `viewer:get-external-vnc-session`
- `viewer:list-external-vnc-sessions`
- `viewer:close-external-vnc-session`

对应前端可调用：

- `window.electronAPI.viewer.createExternalVncSession(...)`
- `window.electronAPI.viewer.getExternalVncSession(...)`
- `window.electronAPI.viewer.listExternalVncSessions()`
- `window.electronAPI.viewer.closeExternalVncSession(...)`

### 3. Web Mode service 已支持外部 VNC 代理

我扩展了：

- `runtime/WebModeService.js`

新增能力：

- `WebSocket -> 远端 VNC TCP` 的桥接
- 新入口路径：
  - `/api/viewer/vnc/:sessionId`

这意味着：

- 桌面版后续可以通过本地 `Sanaka` 服务连外部 VNC
- 网页版也可以通过同一条 `Sanaka` 代理链路连外部 VNC

### 4. 会话返回值已经包含前端可直接使用的 websocket 地址

创建/读取会话时，后端会返回：

- `websocketPath`
- `websocketUrl`
- `localWebsocketUrl`
- `networkWebsocketUrl`

所以你前端不用自己拼代理路径规则。

### 5. preload / contract / type 已同步

我已经同步修改：

- `preload.js`
- `runtime/webModeApi.js`
- `runtime/electronApiContract.js`
- `src/types/electron.d.ts`

这样桌面版和网页版后续都能走同一套 `viewer` API。

## 我没改什么

- 我**没做前端菜单入口**
- 我**没做连接表单**
- 我**没做独立 Viewer 页面**
- 我**没把外部 VNC 接进现有 console 路由**
- 我**没做密码持久化**
- 我**没做连接历史 / 收藏**

## 现在已经具备哪些能力

当前后端已经具备：

1. 创建一个外部 VNC 会话
2. 把会话映射成一个可用的 websocket 代理端点
3. 把浏览器 / noVNC 的 websocket 数据转发到远端 `host:port`
4. 回传会话状态和基本错误状态

## 对方下一步需要接什么

你前端下一步要接的重点是：

1. “更多”菜单里的 `连接到 VNC`
2. 连接表单
3. 独立 Viewer 页面
4. noVNC 与后端 websocket 地址的对接

## 风险和兼容点

### 1. 外部 VNC 不要混入 machine runtime

请不要：

- 伪造 `machineId`
- 把它挂进机器列表
- 把它当成某台 Sanaka 机器控制台

### 2. websocket 地址选择要分环境

后端虽然返回了多个地址字段，但前端要按环境选：

- 桌面版优先本地地址
- 网页版优先当前 Web Mode 可达地址

### 3. v1 还是最小可用版

这轮后端只是把外部 VNC Viewer 的基础桥搭起来了，还没有做：

- 地址收藏
- 会话恢复
- 更细粒度权限收敛
- 复杂认证流

## 验证

我已经跑过：

- `npm run typecheck`
- `npx vitest run runtime/ExternalVncViewerService.test.js runtime/WebModeService.test.js runtime/webModeApi.test.js`

并新增了：

- 外部 VNC 会话服务测试
- Web Mode 外部 TCP 桥接测试
