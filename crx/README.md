# Hedge v3 Chrome Extension

Hedge的浏览器扩展插件。在浏览器环境中提供Hedge核心服务的接入功能，以及使用额外的工具集。
* 在受支持的图源网站上，提供各类易用性优化措施，以增强使用体验;
* 在受支持的图源网站上，提供来源数据收集情况简报，并支持一键收集来源数据;
* 在各类图源网站上，按照既定的规则重命名下载的文件，方便溯源和整理;
* 提供了一个功能特化的书签管理器，支持在一个标签下添加多个URL，以及使用标签组进行管理和查询。

Supported Version: Chrome 104+

## Development

* `Node >= 18.11.10`
* `Typescript`

使用yarn安装全部依赖。
```sh
yarn
```

使用dev script启动开发服务器。开发服务器启动后，加载`./dist`目录即可。
```sh
yarn dev
```

使用build script编译。编译后的产物同样位于`./dist`。
```sh
yarn build
```
