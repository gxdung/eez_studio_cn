[![GitHub release](https://img.shields.io/github/release/eez-open/studio.svg)](https://github.com/eez-open/studio/releases) [![license](https://img.shields.io/github/license/eez-open/studio.svg)](https://github.com/eez-open/studio/blob/master/LICENSE.TXT) [![liberapay](https://img.shields.io/liberapay/receives/eez-open.svg?logo=liberapay)](https://liberapay.com/eez-open/donate) [![Downloads](https://img.shields.io/github/downloads/eez-open/studio/total)](https://github.com/eez-open/studio/releases)

## 说明
本仓库为 EEZ Stuido 的镜像仓库，软件由 [Envox d.o.o.](https://www.envox.si/) 开发。

简体中文开发者：[乐乐龙果冻](https://github.com/gxdung)

中文版本将根据官方版本来本地化，并视情况来修改软件的**页面样式**或**功能**。

如果您有任何问题，或翻译上的建议，请通过 [Issues](https://github.com/gxdung/eez_studio_cn/issues) 提出。

**官方自述说明（English）**：https://github.com/eez-open/studio/blob/master/README.md

**官方仓库**：https://github.com/eez-open/studio

**官方文档**：https://www.envox.eu/eez-studio-docs

**LVGL 文档**：https://docs.lvgl.io/master/details

## 介绍

EEZ Studio 是一款免费且开源的跨平台低代码可视化工具，专为桌面及嵌入式图形用户界面（GUI）设计打造，并支持 [LVGL](https://lvgl.io/) 框架。其内置的 _EEZ Flow_ 功能支持创建复杂的测试和测量自动化场景，而 Instruments(仪器) 功能则能远程控制多种设备及测试测量设备，包括 [EEZ BB3](https://github.com/eez-open/modular-psu) 测试测量机箱、 [EEZ H24005](https://github.com/eez-open/psu-hw) 可编程电源以及任何支持 [SCPI](https://www.ivifoundation.org/scpi/) 协议的测试测量设备，例如 Keysight（是德科技）、Rigol（普源精电）、Siglent（鼎阳科技）等厂商的仪器。

### 所有权和许可证

贡献者在 Contry.txt 中列出。本项目使用 GPLV3 许可证，请参阅 License.txt。
EEZ Studio 使用 [C4.1(集体代码构建规范)](http://rfc.zeromq.org/spec:22) 所述的流程进行贡献。
要报告问题，请使用 [EEZ Studio 问题跟踪器](https://github.com/eez-open/studio/issues)。

_重要说明：Envox d.o.o. 公司不对通过 Build 命令生成的源代码主张任何所有权，但以下情况除外：当使用 MIT 许可证的 EEZ Flow 功能创建的项目。_
_用户拥有 `.eez-project` 项目文件及由该文件中模板定义生成的全部源代码所有权。EEZ Studio 生成的文件可能遵循 MIT、BSD 2.0 或公共领域（Public Domain）许可证。




### EEZ Studio _工程_

![EEZ Studio Project](docs/images/projects_intro.png)

-   模块化可视化开发环境，用于设计 TFT 显示屏界面并定义用户交互（嵌入式 GUI）。
-   生成嵌入式 GUI 功能的 C++ 代码，可直接包含到 [STM32CubeIDE](https://www.st.com/en/development-tools/stm32cubeide.html) 适用于 BB3 和其他 STM32 目标平台）或 [Arduino IDE](https://www.arduino.cc/en/software)（适用于 H24005 和其他兼容 Arduino 的目标平台）
-   仪器定义文件（IDF）构建器，提供上下文敏感的 SCPI 命令帮助 (基于 Keysight 的 [Offline Command Expert 命令集](https://www.keysight.com/main/software.jspx?cc=US&lc=eng&ckey=2333687&nid=-11143.0.00&id=2333687) XML 结构) ，适用于 EEZ Studio _Instrument_ 和 [Keysight Command Expert](https://www.keysight.com/en/pd-2036130/command-expert)
-   SCPI 命令帮助生成器，基于从 ```.odt``` 文件直接生成的书签 HTML，并使用 OpenOffice/LibreOffice 的[EEZ WebPublish](https://github.com/eez-open/WebPublish) 扩展。
-   支持 [LVGL](https://lvgl.io/)（Light and Versatile Graphics Library）8.x 和 9.x 版本。
-   项目模板（基于 giteo.io 仓库）及项目对比功能
-   拖放式编辑器，用于创建仪器、远程控制和管理 (桌面端)
-   基于流程图的低代码编程 (桌面端)

![Flow](docs/images/flow_intro.png)

### EEZ Studio _仪器_

![EEZ Studio Instrument](docs/images/instruments_intro.png)

-   **动态环境**：可配置多个仪器并轻松访问
-   以会话为中心的 SCPI 仪器交互
-  支持串行（通过 USB）、以太网和 VISA (通过免费的 [R&S®VISA](https://www.rohde-schwarz.com/us/driver-pages/remote-control/3-visa-and-tools_231388.html)) T&M 仪器接口
-   直接导入 EEZ Studio 生成的 IDF 以及 **Keysight 的 Offline Command Expert 命令集**
-   IEXT（仪器扩展）目录，支持越来越多的仪器（如 Rigol、Siglent、Keysight 等）
-   记录所有活动历史，并支持搜索/内容过滤
-   通过日历（“热力图”）或会话列表视图来快速导航
-   可由用户定义或从导入的 IDF 预设的快捷键（热键和按钮）。快捷键可包含单个或一系列 SCPI 命令，或 Javascript 代码
-   任务自动化的 Javascript 代码（如日志文件记录、程序列表上传/下载等）也可分配到快捷键
-   SCPI 命令的上下文敏感帮助，并支持搜索
-   文件上传（仪器到PC），支持图像预览（如截图）
-   文件下载（PC到仪器）自动化，用于传输仪器配置文件
-   简单的任意波形编辑器（包络模式和表格模式）
-   以图形方式来显示测量数据
-   FFT 分析、谐波分析及简单数学函数（周期、频率、最小值、最大值、峰值、平均值）
-   将图表导出为 ```CSV``` 文件

---


在 [NGI0 PET](https://nlnet.nl/project/EEZ-DIB/) and [NGI0 Entrust](https://nlnet.nl/project/EEZ-Studio/#ack) 资金（由 NLnet 资助）的支持下，新功能正在开发中。迄今为止，已实现以下里程碑：

-   [M1](https://github.com/eez-open/studio/issues/102) - 可视化编辑器
-   [M2](https://github.com/eez-open/studio/issues/103) - PC 端解释器
-   [M3](https://github.com/eez-open/studio/issues/104) - BB3 解释器
-   [M4](https://github.com/eez-open/studio/issues/134) - PC 调试器
-   [M5](https://github.com/eez-open/studio/issues/135) - BB3 调试器
-   [M6](https://github.com/eez-open/studio/releases/tag/0.9.90) - EEZ 工作流引擎
-   [M7](https://github.com/eez-open/studio/releases/tag/v0.9.91) - 项目中的多语言支持
-   [M8](https://github.com/eez-open/studio/releases/tag/v0.9.92) - 小组件高级控制功能
-   [M9](https://github.com/eez-open/studio/releases/tag/v0.9.93) - 项目模板
-   [M10](https://github.com/eez-open/studio/releases/tag/v0.9.94) - Gitea.io 集成
-   [M11](https://github.com/eez-open/studio/releases/tag/v0.9.95) - 新的 EEZ 工作流扩展
-   [M12](https://github.com/eez-open/studio/releases/tag/v0.9.96) - LVGL 集成
-   [M13](https://github.com/eez-open/studio/releases/tag/v0.9.98) - 独立的工作流面板
-   [M14](https://github.com/eez-open/studio/releases/tag/v0.9.99) - 主页修改和增强功能
-   [M15](https://github.com/eez-open/studio/releases/tag/v0.10.1) - 增强功能（更多示例，扩展管理器，MQTT）
-   [M16](https://github.com/eez-open/studio/releases/tag/v0.10.2) - 在线帮助，增强功能，解决“动作”的错误修复
-   [M17](https://github.com/eez-open/studio/releases/tag/v0.10.3) - 在线帮助，增强功能，修复“小组件”的错误
-   [M18](https://github.com/eez-open/studio/releases/tag/v0.12.0) - 同时控制多种仪器
-   [M19](https://github.com/eez-open/studio/releases/tag/v0.13.0) - 支持非 SCPI 仪器和设备
-   [M20](https://github.com/eez-open/studio/releases/tag/v0.14.0) - 混合表格、树、网格（table/tree/grid）组件
-   [M21](https://github.com/eez-open/studio/releases/tag/v0.15.0) - 项目剪贴板
-   [M22](https://github.com/eez-open/studio/releases/tag/v0.16.0) - 改进以会话为中心的仪器与数据管理工作
-   [M23](https://github.com/eez-open/studio/releases/tag/v0.17.0) - 多媒体支持、网络支持、其他工具
---

## 安装

仅支持 ```64位``` 的操作系统

### Linux

根据您的 Linux 系统，选择列出的安装包（`.deb`、`.rpm`），并使用相应的安装程序进行安装。
此外，还提供了一个自执行的 `.AppImage` 版本，下载后需要在 文件 - 权限 选项中启用 **允许将文件作为程序执行**，然后才能启动。

如果在 Linux 上运行 ```.AppImage``` 版本时遇到问题，请尝试使用 ```--no-sandbox``` 选项运行：
```
./EEZ-Studio-[version].AppImage --no-sandbox
```

### Mac

下载 `eezstudio-mac.zip`，解压后移动 `eezstudio.app` 到应用。

### Windows

下载后运行 `EEZ_Studio_setup.exe`.

### Nix

The Nix flake provides a derivation for EEZ Studio or an overlay
that provides that derivation. It can be used to install the project using
[Nix package manager](https://nixos.org/).

### 从源代码编译并运行

-   安装 `Node.JS 16.x` 或更新版本
-   安装 `node-gyp`，具体请查阅 https://github.com/nodejs/node-gyp#installation

#### Linux

```
sudo apt-get install build-essential libudev-dev libnss3
```

#### Raspbian

安装 `Node.js 16` 和 `npm on Raspberry Pi`
请参阅 https://lindevs.com/install-node-js-and-npm-on-raspberry-pi/
```
sudo apt-get install build-essential libudev-dev libopenjp2-tools ruby-full
sudo gem install fpm
```

#### 全平台

```
git clone https://github.com/eez-open/studio
cd studio
npm install
npm run build
```

启动命令

```
npm start
```

打包（MacOS 和 Raspbian 除外）：

```
npm run dist
```

MacOS:

```
npm run dist-mac-arm64 或 npm run dist-mac-x64
```

Raspbian:

```
npm run dist-raspbian
```

#### Nix

编译

```
nix build 'github:eez-open/studio'
```

启动

```
nix run 'github:eez-open/studio'
```

## USB TMC

如果要使用 EEZ Studio _仪器_ 的 USB-TMC 接口访问 T＆M 仪器，则必须安装 USB TMC 驱动程序。

### Windows

下载后启动 [Zadig](http://zadig.akeo.ie/)。之后选择您的设备，选择 Libusb-Win32，然后按 “替换驱动程序” 按钮：

![Zadig](docs/images/usbtmc_zadin_windows.png)

### Linux

您可能需要将 Linux 帐户添加到 USBTMC 组，然后才能使用 EEZ Studio 访问仪器。使用 USB 数据线连接您的仪器，然后打开，等到启动完成。您需要通过输入以下命令来检查仪器：

```
ls -l /dev/usbtmc*
```

Root 用户或权限，请输入以下命令：

```
sudo groupadd usbtmc
```

最后，将用户名添加到组：

```
sudo usermod -a -G usbtmc <username>
```

需要重新启动。之后，应将 `/dev/usbtmc0` 的 GID 设置为 `usbtmc`。
完成后，通过 USB-TMC 接口来使用仪器。

## FAQ

[FAQ Wiki](https://github.com/eez-open/studio/wiki/FAQ)

**Q**: 默认情况下数据库文件在哪里？
**A**: 取决于操作系统，您可以在下列路径中找到：

-   Linux: `~/.config/eezstudio/storage.db`
-   Mac: `~/Library/Application\ Support/eezstudio/storage.db`
-   Windows: `%appdata%\eezstudio\storage.db`

默认创建的数据库及其位置可以通过 EEZ Studio 的设置部分中更改。


**Q**: 用于访问 T＆M 仪器存储的 Iexts（仪器扩展）在哪里？
**A**: 取决于操作系统，您可以在下列路径中找到：

-   Linux: `~/.config/eezstudio/extensions`
-   Mac: `~/Library/Application\ Support/eezstudio/extensions`
-   Windows: `%appdata%\eezstudio\extensions`


### 链接

-   [官网](https://www.envox.eu/studio/studio-introduction/)
-   [FAQ](https://github.com/eez-open/studio/wiki/Q&A)
-   [Discord](https://discord.gg/q5KAeeenNG) server
-   [X (Twitter)](https://twitter.com/envox)
-   [Mastodon](https://mastodon.social/@envox)
-   [YouTube](https://www.youtube.com/c/eezopen) channel
-   [Liberapay](https://liberapay.com/eez-open/donate) donations <img src="https://liberapay.com/assets/liberapay/icon-v2_white-on-yellow.svg" width="16" />
