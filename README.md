# Hedge v3

Hedge是一个图像管理程序，它提供高复杂度的元数据管理和组织结构。Hedge有以下几项核心功能：
* 存储较大数量的图片、视频；
* 使用集合、画集、目录等多种方式构建图像之间的组织关系；
* 使用多种类型的标签标记每一张图像；
* 管理图像的来源，包括来源的多种数据；
* 基于以上元数据，进行复杂的查询，处理重复、相似和关联项。

Supported platform: Linux, macOS

## Development

程序的主体部分由客户端(Client)、前端(Frontend)、服务端(Server)构成，它们各自分别进行开发，并组装到一起进行调试和打包。

### Client

* `Node >= 20.11.19`
* `Electron`
* `Typescript`

使用yarn安装全部依赖。
```sh
yarn
```

> 安装客户端依赖时，需要下载`Electron`依赖，而这可能存在网络问题。要解决这个问题，可以使用环境变量指定Electron的二进制下载源：
> ```sh
> export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
> ```

客户端使用`build`完成编译。在任何客户端代码运行之前或更改之后，执行编译。编译后的产物位于`client/target`。
```sh
yarn build
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

* `Node >= 20.11.19`
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

* `Gradle >= 8.6`
* `Java >= 21`
* `Kotlin`
* `Javalin`
* `Ktorm`
* `SQLite`

使用gradle安装全部依赖。
```sh
./gradlew
```

在调试运行时，需要为程序指定必须的启动参数。
```sh
--dir                   # 必选参数，指定server资源根目录，通常是{channel}/server目录
--storage-dir           # 可选参数，指定文件存储目录，仅在远程模式下用于覆盖默认存储位置使用
--port                  # 强制指定此端口启动，用于开发或远程模式
--token                 # 强制指定此token启动，用于开发或远程模式
--dev                   # 开发模式，不会自动退出
--remote                # 远程模式，将服务端独立部署时需要指定的参数
```

使用jlink命令编译，使用zip命令打包。打包后的产物为`server/build/image.zip`。
```sh
./gradlew clean jlink zip
```

### Jar & Docker Build

服务端支持部署在任意位置，以远程模式提供服务。因此，服务端同样支持jar打包。

使用build命令完成jar包打包。打包后的产物为`server/build/libs/hedge-v3-server-${version}-all.jar`。
```sh
./gradlew clean build
```
服务端存在特定平台依赖，因此当运行平台与编译平台不一致时，使用`targetPlatform`参数指定目标平台。可以选择`(mac, mac-arm64, linux, linux-arm64, win, all)`。
```sh
./gradlew clean build -PtargetPlatform=linux
```

打包后的jar可以以任意JVM程序允许的方式形式部署。但更推荐使用docker。在`server/docker`存放有镜像构建脚本。

将`hedge-v3-server.jar`存放至构建脚本同一目录，之后使用build.sh脚本完成镜像构建。需要显式指定image tag，未指定时则是默认值`dev`。构建之后的镜像为`hedge-v3-server:<image tag>`。
```sh
./build.sh '<image tag>'
```

在`server/docker`也存放有用作模板的docker compose文件。编辑此文件，更改一部分配置项即可使用。
* env:
    - `TZ`: 指定时区。应当指定与主机相同的时区，服务端的时间将以此为准。错误指定时区可能导致定时任务、时间分区等功能错乱。
    - `STORAGE_DIR`: 额外指定文件存储目录，指定时也需要一同指定该目录的挂载。该变量可以与对应的挂载一同省略，省略后将存放在数据存储目录下。
    - `TOKEN`: 访问token。
* volumes:
    - `/server`: 数据存储目录，存放数据库、日志等基本数据。
    - `/data`: 额外的文件存储目录，需要与环境变量一同使用，将文件归档存储在另外的位置。

## Build & Package

在`client/build`存放有整体打包脚本。进入`client`目录，执行build script自动完成打包。这将完成默认打包流程。打包后的产物位于`dist`目录。
```sh
cd client
yarn package
```

默认流程不包含编译流程。要想在打包的同时编译所有组件，需要使用`yarn install-with-build`。此外，也可以在此命令后添加子命令，以自定义要编译和打包的部分。
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
