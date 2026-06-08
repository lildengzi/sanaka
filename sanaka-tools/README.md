# sanaka-tools

`sanaka-tools` 是 Sanaka 的客户机增强工具项目。

当前第一版目标：

- 语言：`C89`
- 平台：`Win32`
- 系统：`Windows XP` 到 `Windows 11+`
- 功能：纯文本剪贴板共享客户端

当前目录结构：

- `src/`
  - 原生 Win32 客户端源码
- `scripts/`
  - 仅保留一个 Windows PowerShell 构建入口
- `installer/`
  - NSIS 安装器脚本
- `dist/`
  - 编译产物

当前实现阶段：

- 已建立 XP/Win32 客户端源码骨架
- 已接入 Sanaka 工具盘生成逻辑
- 已收口为单一 PowerShell 构建入口
- 已提供 NSIS 安装器脚本
- Windows 侧可自动搜索整机的 `MinGW32` 和 `NSIS`

## 本地构建

在 Windows PowerShell 中运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\sanaka-tools\scripts\build-installer-xp.ps1
```

脚本会：

- 自动搜索整台电脑上的 `MinGW32 gcc`
- 自动搜索整台电脑上的 `makensis.exe`
- 编译 `sanaka_clipboard.exe`
- 生成 `setup.exe`

## 安装器

NSIS 脚本：

```text
sanaka-tools/installer/sanaka-tools.nsi
```

目标输出：

```text
sanaka-tools/dist/setup.exe
```
