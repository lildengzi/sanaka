# Sanaka QEMU 编译与打包流程

这份文档的目标很直接：

- 从 `QEMU` 官方源码开始
- 在 `macOS arm64` 上编译出 `Sanaka` 需要的 QEMU
- 把它打进 `Sanaka.app`
- 最终做到：**目标机器不需要 Homebrew，也能运行**

当前假设环境：

- 宿主机：`macOS`
- 架构：`arm64`
- 机器：`Apple Silicon`
- 并行编译：优先用 `-j8`，如果机器发热或明显卡顿，退到 `-j6`

---

## 1. 打包目标

这里先把目标说死，避免后面跑偏。

我们要的不是：

- 依赖用户自己安装 `brew install qemu`
- 只在你这台开发机能跑
- 把 Homebrew 里的二进制硬拷过去碰碰运气

我们要的是：

- `Sanaka.app` 内置 QEMU
- `Sanaka.app` 内置 QEMU 依赖的 `.dylib`
- `Sanaka.app` 内置 `share/qemu`、固件、`pc-bios`
- 换台没有 Homebrew 的机器，也能启动

也就是说，重点不是“全静态”，而是“**自包含**”。

---

## 2. 先决定编什么

按目前 `Sanaka` 代码里已经开放的架构选择，`Sanaka` 的正式 macOS 打包必须包含这 7 个 target：

```text
x86_64-softmmu
i386-softmmu
aarch64-softmmu
arm-softmmu
riscv64-softmmu
ppc-softmmu
ppc64-softmmu
```

不要裁成 3 个。当前运行时探测、命令构建和打包验证都已经按这 7 个架构对齐。

---

## 3. 安装构建依赖

先确保命令行工具可用：

```bash
xcode-select -p
```

如果没装：

```bash
xcode-select --install
```

然后安装构建依赖：

```bash
brew install meson ninja pkg-config python glib pixman capstone dtc \
  gnutls jpeg-turbo libpng libslirp libssh libusb lzo ncurses snappy vde zstd
```

可顺手确认：

```bash
python3 --version
pkg-config --version
meson --version
ninja --version
```

---

## 4. 下载官方源码

建议单独放在源码目录里：

```bash
mkdir -p ~/src
cd ~/src
curl -LO https://download.qemu.org/qemu-11.0.1.tar.xz
tar -xf qemu-11.0.1.tar.xz
cd qemu-11.0.1
```

如果以后版本升级，只把 `11.0.1` 换掉即可。

---

## 5. 创建构建目录

不要在源码根目录直接编。

```bash
mkdir -p build
cd build
```

---

## 6. 配置 QEMU

### 6.1 当前正式配置

这份配置面向 `Sanaka` 当前路线：

- 以 `softmmu` 为主
- 不折腾 Cocoa 图形窗口
- 不编文档

```bash
../configure \
  --target-list=x86_64-softmmu,i386-softmmu,aarch64-softmmu,arm-softmmu,riscv64-softmmu,ppc-softmmu,ppc64-softmmu \
  --disable-docs \
  --disable-gtk \
  --disable-sdl \
  --disable-cocoa \
  --disable-curses \
  --disable-opengl \
  --disable-spice \
  --disable-spice-protocol \
  --disable-vde \
  --disable-libiscsi \
  --disable-libssh \
  --disable-libusb \
  --disable-usb-redir \
  --disable-gnutls \
  --disable-curl \
  --disable-capstone \
  --disable-guest-agent \
  --enable-slirp \
  --audio-drv-list=coreaudio
```

这套配置的意思很简单：

- 保留 `Sanaka` 需要的 7 个系统模拟器
- 砍掉 GTK / SDL / Cocoa / SPICE 这一类当前产品没用到的前端依赖
- 保留 `slirp` 网络与 `coreaudio`
- 目标不是“功能最多”，而是“能分发、依赖可控、和 Sanaka 当前路线一致”

### 6.2 `--enable-cocoa` 是什么

`--enable-cocoa` 的意思是：让 QEMU 自己支持 macOS 的 Cocoa 图形窗口。

但 `Sanaka` 现在的显示路线是：

- `QEMU`
- `VNC`
- `noVNC`
- `Electron`

所以这不是当前重点，默认先不加。

---

## 7. 编译

仓库里已经准备了脚本：

```bash
bash /Users/steve372dzudo/sanaka/scripts/build-qemu-sanaka-macos.sh /Volumes/sks/src/qemu-11.0.1
```

如果你手动编，先用：

```bash
make -j"$(sysctl -n hw.logicalcpu)"
```

如果你想保守一点，也可以手动改成 `-j8` 或 `-j6`。

如果中途失败，先不要急着删目录，先看报错通常更值钱。

---

## 8. 验证编译产物

编译完成后先确认关键二进制：

```bash
./qemu-system-x86_64 --version
./qemu-system-i386 --version
./qemu-system-aarch64 --version
./qemu-img --version
```

如果你编了完整 target，也可以看：

```bash
ls | rg "^qemu-system-"
```

---

## 9. 安装到 staging 目录

不要一开始就直接装到系统路径。

建议先装到临时目录：

```bash
rm -rf ~/qemu-stage
mkdir -p ~/qemu-stage
make install DESTDIR=~/qemu-stage
```

装完后，大概率会得到类似结构：

```text
~/qemu-stage/
  usr/local/bin/
  usr/local/share/qemu/
  usr/local/share/applications/
  ...
```

你真正要关心的是：

- `bin/`
- `share/qemu/`
- `share/` 下可能用到的 BIOS / 固件资源

---

## 10. 找出运行时依赖

这一段最关键。因为“能编出来”不等于“换台机器能跑”。

先看二进制依赖了什么：

```bash
otool -L ~/qemu-stage/usr/local/bin/qemu-system-x86_64
otool -L ~/qemu-stage/usr/local/bin/qemu-system-i386
otool -L ~/qemu-stage/usr/local/bin/qemu-img
```

如果输出里出现这些路径：

```text
/opt/homebrew/...
```

说明它还依赖 Homebrew 动态库，不能直接拿去发。

你需要把这些 `.dylib` 一起收进 app bundle。

---

## 11. 打进 Sanaka.app

仓库里已经有完整脚本链：

```bash
npm run pack:mac
```

它会做三件事：

1. 构建前端与 Electron 应用
2. 用本地 `node_modules/electron/dist` 打出 `release/mac-arm64/Sanaka.app`
3. 把 QEMU 二进制、`pc-bios` 和依赖 `.dylib` 嵌进 `.app`

现在的关键点是：

- `electron-builder` 已明确使用本地 Electron 发行目录，不再额外联网下载 Electron
- `QEMU` 二进制会进入：
  - `Sanaka.app/Contents/Resources/qemu/bin`
- `pc-bios` 会进入：
  - `Sanaka.app/Contents/Resources/qemu/share/qemu`
- 非系统 `.dylib` 会进入：
  - `Sanaka.app/Contents/Frameworks`

---

## 12. 当前验证结果

当前仓库已经验证通过：

- `release/mac-arm64/Sanaka.app` 已成功生成
- 包内已包含：
  - `qemu-system-x86_64`
  - `qemu-system-i386`
  - `qemu-system-aarch64`
  - `qemu-system-arm`
  - `qemu-system-riscv64`
  - `qemu-system-ppc`
  - `qemu-system-ppc64`
  - `qemu-img`
- `QemuDetector` 可以直接从 `.app/Contents/Resources/qemu/bin` 发现全部 7 个架构
- `qemu-system-aarch64` 在包内仍保留 `com.apple.security.hypervisor` entitlement
- `codesign -vvv release/mac-arm64/Sanaka.app` 已通过

---

## 11. 规划 Sanaka.app 内部目录

推荐目录：

```text
Sanaka.app/
  Contents/
    MacOS/
      Sanaka
    Frameworks/
      libglib-2.0.0.dylib
      libpixman-1.0.dylib
      libgnutls.30.dylib
      ...
    Resources/
      qemu/
        bin/
          qemu-system-x86_64
          qemu-system-i386
          qemu-system-aarch64
          qemu-system-arm
          qemu-system-riscv64
          qemu-system-ppc
          qemu-system-ppc64
          qemu-img
        share/
          qemu/
            ...
```

重点：

- 可执行文件放 `Resources/qemu/bin`
- 依赖库放 `Frameworks`
- QEMU 共享资源放 `Resources/qemu/share/qemu`

---

## 12. 拷贝 QEMU 产物进 app bundle

先假设你的应用路径是：

```bash
APP="/Applications/Sanaka.app"
```

然后创建目录：

```bash
mkdir -p "$APP/Contents/Resources/qemu/bin"
mkdir -p "$APP/Contents/Resources/qemu/share"
mkdir -p "$APP/Contents/Frameworks"
```

拷贝二进制：

```bash
cp ~/qemu-stage/usr/local/bin/qemu-system-x86_64 "$APP/Contents/Resources/qemu/bin/"
cp ~/qemu-stage/usr/local/bin/qemu-system-i386 "$APP/Contents/Resources/qemu/bin/"
cp ~/qemu-stage/usr/local/bin/qemu-system-aarch64 "$APP/Contents/Resources/qemu/bin/"
cp ~/qemu-stage/usr/local/bin/qemu-system-arm "$APP/Contents/Resources/qemu/bin/" 2>/dev/null || true
cp ~/qemu-stage/usr/local/bin/qemu-system-riscv64 "$APP/Contents/Resources/qemu/bin/" 2>/dev/null || true
cp ~/qemu-stage/usr/local/bin/qemu-system-ppc "$APP/Contents/Resources/qemu/bin/" 2>/dev/null || true
cp ~/qemu-stage/usr/local/bin/qemu-system-ppc64 "$APP/Contents/Resources/qemu/bin/" 2>/dev/null || true
cp ~/qemu-stage/usr/local/bin/qemu-img "$APP/Contents/Resources/qemu/bin/"
```

拷贝共享资源：

```bash
cp -R ~/qemu-stage/usr/local/share/qemu "$APP/Contents/Resources/qemu/share/"
```

如果后面要用固件，也要一起确认是否在 `share/qemu` 或其他 `share` 路径内。

---

## 13. 拷贝动态库

先看某个二进制依赖什么：

```bash
otool -L "$APP/Contents/Resources/qemu/bin/qemu-system-x86_64"
```

把所有来自 Homebrew 的动态库拷到：

```bash
$APP/Contents/Frameworks
```

你可以先手动拷第一轮，例如：

```bash
cp /opt/homebrew/opt/glib/lib/libglib-2.0.0.dylib "$APP/Contents/Frameworks/" 2>/dev/null || true
cp /opt/homebrew/opt/pixman/lib/libpixman-1.0.dylib "$APP/Contents/Frameworks/" 2>/dev/null || true
cp /opt/homebrew/opt/gnutls/lib/libgnutls.30.dylib "$APP/Contents/Frameworks/" 2>/dev/null || true
```

但正式做时，不建议靠手抄，应该写脚本递归收集。

---

## 14. 改写动态库引用路径

这是第二个关键点。

如果不改，QEMU 二进制依然会去找：

```text
/opt/homebrew/...
```

要改成 app 内部路径。

先查看一个二进制：

```bash
otool -L "$APP/Contents/Resources/qemu/bin/qemu-system-x86_64"
```

如果看到：

```text
/opt/homebrew/opt/glib/lib/libglib-2.0.0.dylib
```

就改成：

```bash
install_name_tool -change \
  /opt/homebrew/opt/glib/lib/libglib-2.0.0.dylib \
  @executable_path/../../../Frameworks/libglib-2.0.0.dylib \
  "$APP/Contents/Resources/qemu/bin/qemu-system-x86_64"
```

对 `qemu-system-i386`、`qemu-system-aarch64`、`qemu-img` 也要同样处理。

同时，`Frameworks` 里的 `.dylib` 自己可能还会引用其他 Homebrew `.dylib`，也要继续改。

比如检查：

```bash
otool -L "$APP/Contents/Frameworks/libglib-2.0.0.dylib"
```

然后继续把它改成：

```text
@rpath/xxx
```

或 app 内部相对路径。

这一步通常需要写脚本递归做。

---

## 15. 验证“脱离 Homebrew”是否成功

理想状态下，下面命令的输出里：

- 不应该再出现 `/opt/homebrew`
- 不应该再出现开发机私有路径

检查命令：

```bash
otool -L "$APP/Contents/Resources/qemu/bin/qemu-system-x86_64"
otool -L "$APP/Contents/Resources/qemu/bin/qemu-system-i386"
otool -L "$APP/Contents/Resources/qemu/bin/qemu-img"
```

你也应该继续检查：

```bash
otool -L "$APP/Contents/Frameworks/"*.dylib
```

如果这里还残留 `Homebrew` 路径，说明还没打包完。

---

## 16. 在 Sanaka 里优先使用内置 QEMU

后端运行时查找顺序建议固定为：

1. `Sanaka.app/Contents/Resources/qemu/bin/...`
2. 用户设置的自定义 QEMU 路径
3. 系统 `PATH`

这样开发阶段还能回退系统 QEMU，但正式包默认走内置 QEMU。

---

## 17. 代码签名

只要你改过：

- `Sanaka.app`
- `Frameworks/*.dylib`
- `Resources/qemu/bin/*`

就要重新签名。

开发阶段先用临时签名：

```bash
codesign --force --deep --sign - "$APP"
```

如果后面要正式分发，再换成正式证书。

---

## 18. 最后的手工验证

至少做这几项：

1. 在当前开发机上启动 `Sanaka.app`
2. 确认能检测到内置 QEMU
3. 启动一台 `x86_64` 虚拟机
4. 启动一台 `i386` 虚拟机
5. 测试 `qemu-img` 相关功能
6. 在没有 Homebrew QEMU 的环境里复测

最重要的是最后一条。

如果目标机器没有 `/opt/homebrew/opt/qemu` 还能跑，才算真的成功。

---

## 19. 第一阶段建议

如果你现在要尽快推进，不要一上来追“最完美自动化”，建议分三步：

### 第一步

先把 QEMU 源码编出来：

```bash
../configure \
  --target-list=x86_64-softmmu,i386-softmmu,aarch64-softmmu,arm-softmmu,riscv64-softmmu,ppc-softmmu,ppc64-softmmu \
  --disable-docs

make -j8
```

### 第二步

先手动把：

- `qemu-system-*`
- `qemu-img`
- `share/qemu`

塞进 `Sanaka.app`

### 第三步

再补一个脚本，自动做：

- 依赖扫描
- `.dylib` 收集
- `install_name_tool` 重写
- 重签名

---

## 20. 仓库内现成脚本

现在仓库里已经补了两份脚本：

- [scripts/build-qemu-sanaka-macos.sh](/Users/steve372dzudo/sanaka/scripts/build-qemu-sanaka-macos.sh)
- [scripts/embed-qemu-macos.sh](/Users/steve372dzudo/sanaka/scripts/embed-qemu-macos.sh)

它们的职责分别是：

- `build-qemu-sanaka-macos.sh`
  - 用 `Sanaka` 当前需要的 7 个架构重建 QEMU
  - 关闭 `GTK / SDL / Cocoa / Spice / libusb / libssh / libiscsi / curl / gnutls`
  - 保留 `slirp`、`hvf`、`tcg`、`qemu-img`

- `embed-qemu-macos.sh`
  - 把编译好的 QEMU 拷进 `Sanaka.app`
  - 把非系统 `.dylib` 一起拷进 `Contents/Frameworks`
  - 自动把依赖路径重写成 app 内部路径
  - 可选做一次 ad-hoc `codesign`

### 20.1 重编 QEMU

```bash
bash /Users/steve372dzudo/sanaka/scripts/build-qemu-sanaka-macos.sh /Volumes/sks/src/qemu-11.0.1
```

默认会生成：

```text
/Volumes/sks/src/qemu-11.0.1/build-sanaka
```

### 20.2 塞进 Sanaka.app

```bash
bash /Users/steve372dzudo/sanaka/scripts/embed-qemu-macos.sh \
  /Volumes/sks/src/qemu-11.0.1/build-sanaka \
  /Applications/Sanaka.app \
  --sign
```

如果你只是想先拷进去、不签名，就去掉 `--sign`。

---

## 21. 当前最值得你先做的命令

如果你现在就要开工，先执行这些：

```bash
brew install meson ninja pkg-config python glib pixman capstone dtc \
  gnutls jpeg-turbo libpng libslirp libssh libusb lzo ncurses snappy vde zstd

mkdir -p ~/src
cd ~/src
curl -LO https://download.qemu.org/qemu-11.0.1.tar.xz
tar -xf qemu-11.0.1.tar.xz
cd qemu-11.0.1
mkdir -p build
cd build

../configure \
  --target-list=x86_64-softmmu,i386-softmmu,aarch64-softmmu,arm-softmmu,riscv64-softmmu,ppc-softmmu,ppc64-softmmu \
  --disable-docs

make -j8
```

编完后先跑：

```bash
./qemu-system-x86_64 --version
./qemu-system-i386 --version
./qemu-system-aarch64 --version
./qemu-img --version
```

如果这些都正常，再进入“拷入 `Sanaka.app`”阶段。

---

## 22. 后续可补

这份文档还没替你自动化的部分包括：

- 自动收集 `.dylib` 的脚本
- 自动改写 `install_name_tool` 的脚本
- Electron 打包时自动塞入 QEMU 的流程
- `.saka` 文档包注册与正式签名/公证

这些下一步都可以继续补，但顺序上，先把“编译成功 + 手动打进 app”跑通最重要。
