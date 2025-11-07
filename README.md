# Hedge v3

Hedge是一个图库程序，它为图像管理提供高复杂度的元数据管理和组织结构。

主要特性：
* 存储较大数量的图片、视频；
* 使用集合、画集、目录等多种方式构建图像之间的组织关系；
* 使用多种类型的标签标记每一张图像；
* 记忆和管理图像的来源；
* 进行复杂的查询，处理重复和相似项。

支持的平台: macOS, Linux, Windows

## Development

程序的主体部分由客户端(Client)、前端(Frontend)、服务端(Server)构成，它们各自分别进行开发，并组装到一起进行调试和打包。

### Client

* `Node >= 22.11.0`
* `Vite`
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

在安装完成后，需要重建原生模块：
```
npx electron-rebuild
```

客户端使用vite搭建开发环境。复制一份`.env.development`到`.env.development.local`作为开发模式下的连接参数。
```sh
# 在调试模式启动，启用devtool。指定此参数，下列其他参数才有效。
VITE_DEBUG_MODE=true
# 指定当前启动使用的频道。
VITE_CHANNEL=default
# 指定一个文件夹作为开发模式数据文件夹。
VITE_LOCAL_DATA_PATH=../userdata.local

# 从指定压缩包调用后台服务程序，用于后台服务生产模式+资源管理功能调试。
VITE_SERVER_FROM_RESOURCE=../server/build/image.zip
# 从指定HOST调用后台服务，用于后台服务业务开发。使用此选项时后台服务启动管理功能被禁用。
VITE_SERVER_FROM_HOST=localhost:9000

# 从指定文件夹加载前端资源，用于前端生产模式+客户端开发模式。
VITE_FRONTEND_FROM_FOLDER=../frontend/dist
# 从指定URL加载前端资源，用于前端业务开发。
VITE_FRONTEND_FROM_URL=http://localhost:5173
```
配置好开发模式下的连接参数和数据加载位置后，使用dev命令启动开发服务器。编译产物位于`frontend/dist-electron`目录。
```sh
yarn dev
```

### Frontend

* `Node >= 20.11.19`
* `Vite`
* `Vue 3.x`
* `Typescript`
* `Sass`
* `Fortawesome free`

使用yarn安装全部依赖。
```sh
yarn
```

前端也使用vite搭建开发环境。使用dev命令启动开发服务器。
```sh
yarn dev
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

建议使用IntelliJ IDEA进行开发和调试。在调试运行时，需要为程序指定必须的启动参数。
```sh
--dir                   # 必选参数，指定server资源根目录，通常是{channel}/server目录
--storage-dir           # 可选参数，指定文件存储目录，仅在远程模式下用于覆盖默认存储位置使用
--port                  # 强制指定此端口启动，用于开发或远程模式
--token                 # 强制指定此token启动，用于开发或远程模式
--dev                   # 开发模式，不会自动退出
--remote                # 远程模式，将服务端独立部署时需要指定的参数
```

## Build & Package

### Server

使用jlink命令编译，以及使用zip命令将程序打包。打包后的产物为`server/build/image.zip`。
```sh
./gradlew clean jlink zip
```

### Frontend

使用build命令编译。编译后的产物为`frontend/dist`。
```sh
yarn build
```

### Client & Package

使用build命令可以仅编译客户端部分代码。编译产物同样位于`frontend/dist-electron`目录。此命令可用于检验客户端编译结果。
```sh
yarn build
```

使用package命令进行应用程序打包。
```sh
yarn package
```
该命令会自动执行客户端代码编译，因此在执行之前不需要执行`yarn build`；  
在打包之前，需要先完成后台服务和前端的编译，确保编译产物均在它们各自的位置。

打包完成后，可以在`client/dist`目录找到打包产物。

### Server Deploy & Docker Build

服务端支持部署在任意位置，以远程模式提供服务。为此，需要将服务端单独打成jar包，用于传统的JRE部署。

#### Jar

使用build命令完成jar包打包。打包后的产物为`server/build/libs/hedge-v3-server-${version}-all.jar`。
```sh
./gradlew clean build
```
服务端存在特定平台依赖，因此当运行平台与编译平台不一致时，使用`targetPlatform`参数指定目标平台。可以选择`(mac, mac-arm64, linux, linux-arm64, win, all)`。
```sh
./gradlew clean build -PtargetPlatform=linux
```

#### Docker

打包后的jar可以以任意JVM程序允许的方式形式部署。但更推荐使用docker。在`server/docker`目录可以找到镜像构建脚本。

使用build.sh脚本完成镜像构建。需要显式指定image tag和jar path，未指定时则是默认值`dev`和`hedge-v3-server.jar`。构建之后的镜像为`hedge-v3-server:<image tag>`。
```sh
server/docker/build.sh '<image tag>' '<jar path>'
# 举例
server/docker/build.sh 0.0.1-beta server/build/libs/hedge-v3-server-0.0.1-beta-all.jar
```

#### Docker Compose

在`server/docker`目录也可以找到用作模板的docker compose文件。编辑此文件，更改一部分配置项即可使用。
* user: 设置为当前或所需用户的UID:GID。获得方式`id -u`, `id -g`。
* env:
    - `TZ`: 指定时区。应当指定与主机相同的时区，服务端的时间将以此为准。错误指定时区可能导致定时任务、时间分区等功能错乱。
    - `STORAGE_DIR`: 额外指定文件存储目录，指定时也需要一同指定该目录的挂载。该变量可以与对应的挂载一同省略，省略后将存放在数据存储目录下。
    - `TOKEN`: 访问token。
* volumes:
    - `/server`: 数据存储目录，存放数据库、日志等基本数据。
    - `/data`: 额外的文件存储目录，需要与环境变量一同使用，将文件归档存储在另外的位置。
