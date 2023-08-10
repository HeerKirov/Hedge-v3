# Hedge v3

Hedge是一个本地存储的相册管理程序。它不适合开箱即用、简单轻量的使用场景，相反，它的主要目标是提供高复杂度的元数据管理和组织结构。

Hedge有以下几项核心功能：
* 本地存储较大数量的图片、视频；
* 使用集合、画集、目录等多种方式构建图像之间的组织关系；
* 使用多种类型的标签标记每一张图像；
* 管理图像的来源，包括来源的多种数据；
* 基于以上元数据，进行复杂的查询；
* 基于以上元数据，寻找重复、相似和关联项。

> Supported platform: `Linux`, `macOS`

## Development

### Client

* `Node >= 18.11.10`
* `Electron`
* `Typescript`

使用yarn安装全部依赖。
```sh
yarn
```

> 安装客户端依赖时，需要下载`Electron`依赖，而这可能存在网络问题。要解决这个问题，可以使用环境变量指定Electron的二进制下载源：
> ```sh
> yarn config set ELECTRON_MIRROR https://npmmirror.com/mirrors/electron/
> ```

客户端使用`tsc`完成编译。在任何客户端代码运行之前或更改之后，执行编译。编译后的产物位于`client/target`。
```sh
yarn tsc
```
在开发过程中，有必要使用与生产环境隔离的数据库；此外，客户端还联系前端和后台服务，这两部分都需要不同程度的开发调试。为此客户端提供了相关的调试选项。
```sh
cp args.sh args.local.sh
yarn dev
```
复制一份`args.sh`作为开发模式启动参数。执行dev script以开发模式启动。编辑`args.local.sh`文件以调整启动参数。
```sh
--debug-mode            # 在调试模式启动，启用devtool。指定此参数，下列其他参数才有效。
--local-data-path       # 指定一个文件夹作为开发模式数据文件夹。
--frontend-from-url     # 从指定URL加载前端资源，用于前端业务开发。
--frontend-from-folder  # 从指定文件夹加载前端资源，用于前端生产模式+客户端开发模式。
--server-fron-url       # 从指定URL调用后台服务，用于后台服务业务开发。使用此选项时后台服务启动管理功能被禁用。
--server-from-folder    # 从指定文件夹调用后台服务程序，用于后台服务生产模式+客户端开发模式。使用此选项时资源管理功能被禁用。
--server-from-resource  # 从指定压缩文件调用后台服务程序，用于后台服务生产模式+资源管理功能调试。
```

### Frontend

* `Node >= 16.11.56`
* `Vite`
* `Vue 3.x`
* `Typescript`
* `Sass`
* `Fort-Awesome free`

使用yarn安装全部依赖。
```sh
yarn
```

使用dev script启动开发服务器。
```sh
yarn dev
```

使用build script编译。编译后的产物位于`frontend/dist`。
```sh
yarn build
```

### Server

* `Gradle >= 7.5`
* `Java >= 17`
* `Kotlin`
* `Javalin`
* `Ktorm`
* `SQLite`

使用gradle安装全部依赖。
```sh
gradle
```

使用run命令调试运行程序。
```sh
gradle run
```
在调试运行时，需要为程序指定必须的启动参数。
```sh
--channel-path          # 必选参数，指定启动的channel的资源根目录
--force-port            # 强制指定此端口启动，用于开发
--force-token           # 强制指定此token启动，用于开发
--permanent             # 强制永不自动退出，用于开发
```

使用jlinkZip命令编译。编译后的产物位于`server/build/image.zip`。
```sh
gradle clean jlinkZip
```

## Build & Package

在`client/build`存放有整体打包脚本。进入`client`目录，执行build script自动完成打包。这将完成默认打包流程。打包后的产物位于`dist/Hedge`。
```sh
cd client
yarn build
```

除默认流程外，还可以添加命令以执行部分构建。
```sh
clean               # 清空dist目录
build-client        # 对client项目执行编译
build-frontend      # 对frontend项目执行生产环境编译
build-server        # 对server项目执行生产环境编译打包
install-app         # 在dist目录下添加electron应用程序的内容
install-client      # 将client资源添加到electron程序
install-frontend    # 将frontend资源添加到electron应用程序
install-server      # 将server资源添加到electron应用程序
```
