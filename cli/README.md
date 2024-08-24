# Hedge v3 Command Line Application

Hedge的命令行工具。在CLI环境下进行服务控制，数据管理，以及使用额外的工具集。
* 从命令行启动App;
* 使用`json`, `yaml`及`toml`格式的文件加载元数据和设置;
* 从预设的来源站点下载来源数据;
* 从本地数据库加载来源数据。

Supported platform: `Linux`, `macOS`

## Development

* `Rust stable >= 1.70.0`

在开发过程中，建议使用单独的配置文件，与生产环境隔离。使用`LOCAL_CONFIG_PATH`环境变量显式指定一个配置文件。
```sh
cp config.template.toml config.local.toml
LOCAL_CONFIG_PATH=./config.local.toml cargo run -- --help
```

## Build

使用cargo完成编译。
```sh
cargo build --release
```

## How to use

在生产环境，配置文件将从默认位置读取。将`config.template.toml`复制一份到此处，并编辑必要的配置项。
* 对于Linux，这个文件是`.config/Hedge-v3/cli/config.toml`;
* 对于MacOS，这个文件是`Library/Application Support/Hedge-v3/cli/config.toml`。

之后，将`target/release/hedge_cli`存放至任意位置运行。

### Completion

执行`completion`命令，选择所用的shell类型，以获取命令补全脚本。
```sh
hedge completion zsh > _hedge
```
随后将`_hedge`脚本放置到补全脚本目录即可。  
例如，bash可放在`/usr/share/bash-completion/completions`，zsh可放在`/usr/share/zsh/vendor-completions`(或者如`$HOME/.oh-my-zsh/completions`这类位置)。