# Checklist

## Product

- [ ] “更多”菜单中新增 `连接到 VNC`
- [ ] 桌面版与网页版入口文案一致
- [ ] 外部 VNC 会话不进入机器对象列表
- [ ] 外部 VNC 会话不伪装成 machine console

## Input

- [ ] 支持输入主机/IP
- [ ] 支持输入端口
- [ ] 端口默认值为 `5900`
- [ ] 支持可选密码
- [ ] 支持 `host:port` 形式快速输入或等价解析

## Viewer

- [ ] 连接成功后进入独立 Viewer 页面
- [ ] Viewer 页面显示外部 VNC 连接状态
- [ ] Viewer 页面支持断开连接
- [ ] Viewer 页面复用现有 noVNC 路线

## Backend

- [ ] 桌面版可代理外部 `VNC` 目标
- [ ] 网页版可通过 `Sanaka` 服务端中转连接外部 `VNC`
- [ ] 外部 VNC 会话与 runtime machine state 分离
- [ ] 错误返回经过用户向整理

## Failure Handling

- [ ] 主机为空时阻止提交
- [ ] 非法端口有明确提示
- [ ] 连接失败有用户可理解提示
- [ ] 认证失败有用户可理解提示
- [ ] 远程断开后 Viewer 状态可恢复或可退出

## Verification

- [ ] 桌面版可以连接一个外部 VNC 地址
- [ ] 网页版可以连接一个外部 VNC 地址
- [ ] 连接不会污染 recent machines
- [ ] `npm run typecheck`
- [ ] 相关测试通过
