## [0.13.0] - 2025-07-19
### Changed
* 目录树多选: 目录树现在已支持像图库一样的多选以及方向键操控。同时，添加了右键菜单重命名功能，调整了菜单的项结构。
* 集合-Tagme属性: 增加了集合和图像之间Tagme属性的联动。现在集合的Tagme属性跟收藏状态一样，视作图像的Tagme属性的代理属性。所有图像的Tagme属性会合并计算为集合的Tagme属性；集合的Tagme属性的修改会影响全部图像。
* 元数据标签联动重做: 
  - 集合与图像、画集与图像之间的元数据标签的联动重做为合并模式，双方都同时持有来自自己的以及来自关联对方的元数据标签；
  - 同时，为了更加清晰的持有关系，这两者会在列表中区分显示，更加明确区分来源；
  - 由于来源进行了明确的区分，针对不同来源的编辑也有了不同的效果。在集合中可以选择编辑自己的标签或者以批量模式编辑所有子项的标签；在图像中可以选择编辑自己的标签或者集合的标签。简而言之，在元数据标签属性上，集合同时具有代理模式与自我持有。
* 元数据标签-拼音名称索引: 为所有的元数据标签添加了基于汉字的拼音索引，以后可以使用拼音文本进行搜索了。
* 外部链接指定浏览器: 现在，可以在设置中指定打开外部链接所使用的浏览器了。
### Fixed
* 修复数据端点在接收事件响应后的更新时未校验变更的问题。此问题曾导致诸如“导入项目侧边栏”在进行编辑并立刻切换选择项时，如果上一个编辑事件的请求返回较慢，可能导致在切换完选择项后，又被刷新成上一个选择项的数据。
* 修复在集合之类的位置拖拽多个项目到两端插入时，有可能越过集合外的临近项，造成乱序的问题。该问题是未对此情况特殊处理，而是直接从端点向外计算了插入位置造成的。
* **[CRX]** 修复EHentai站点中，识别图像数量时，若数量超过1000，则无法正确识别数字的问题。
### Optimized
* 描述文本框改进: 现在在描述项的多行输入文本框中，使用Enter将触发保存，而使用Shift/Meta+Enter触发换行。
### Refactor
* **[SERVER]** 注解相关的类与表已完全删除。

## [0.12.4] - 2025-07-01
### Changed
* Tagme批量编辑器优化: 在多选模式下批量编辑Tagme时，编辑器已可以单独调整每一个子项是要添加还是移除，而不再是将所有项统一设为一个定值。
* **[CRX]** Pixiv标签: 将"AI生成"、"R-18"、"R-18G"作为meta类型的标签加入来源数据收集范围。
### Fixed
* 修复集合详情页内的侧边栏，即使在没有相关数据显示的情况下，也仍然能通过快捷键切换进相关数据页面的问题。该问题是集合/集合子项存在的相关项(子项/父集合)被隐藏而相关页面没有对此做处理导致的。
* 在图库侧边栏，当不存在相关项目/来源数据而使用快捷键尝试切换面板时，引发的闪屏已完全消除。
* **[CRX]** 修复Pixiv站点加载脚本的问题，修复由于Pixiv网站变动导致的初次来源数据加载失败。
### Optimized
* 来源标签的显示名称现在可以留空，而不会被强制填写为与表示编码一致。同时对于现有数据，现有数据中显示名称与表示编码一致的，将清除其显示名称的值。

## [0.12.3] - 2025-04-12
### Added
* Windows系统支持: 为App添加Windows系统支持，但仅限于remote mode。
### Fixed
* **[CRX]** 修复Kemono站点中下载文件触发的来源收集总是按Gumroad格式组织ID的问题。
* **[CRX]** 修复Kemono站点中，revision页面下无法正常收集来源数据的问题。
### Performance
* 大视频文件加载优化: 较大的视频文件会使用实时网络流，不再需要等待本地缓存下载完毕。此外，客户端的本地文件缓存模块已调整实现方式，预计将消除下载不完全导致的加载问题。

## [0.12.2] - 2025-03-22
### Added
* **[CRX]** Fantia支持: 已支持在Fantia站点中收集来源，并添加了下载重命名和适量的易用性改进。
### Changed
* Fantia站点: 已将内置Fantia站点的分页机制调整为“页码和页名”。
* HQL评分有无的筛选: 图库和画集的HQL查询中的score字段现已支持省略其运算符和值，此时将仅按照评分的有无来筛选。此修改使得可以筛选出无评分的项了。
### Fixed
* 修复拖拽项目到集合功能的一项问题。当向集合内一次拖拽来自同一时间分区和来自不同时间分区的项时，仍然会在重算排序时间时囊括从集合到本时间分区的插入项目的时间跨度，从而导致集合内项目大幅跨序。修复之后，计算排序时间时仅会基于原集合内项目的时间。
* 尝试修复文件重复导入的问题。当使用文件监听功能，一次性添加大量文件时，有小概率重复导入一些文件。添加了同文件名短期屏蔽机制，避免重复触发。

## [0.12.1] - 2025-03-06
### Added
* Gumroad站点: 已添加Gumroad站点内置支持。
* **[CRX]** Kemono Gumroad支持: 已支持在Kemono站点中收集Gumroad的来源。
* **[CRX]** 全部下载功能: 在FANBOX站点右键菜单添加下载全部图像的功能。
* **[CRX]** 附件重命名功能: 在特定站点下载zip、psd等资源类附件时，支持为它们添加前缀ID标识。
* **[CRX]** 附件下载时收集来源数据: 在特定站点下载zip、psd等资源类附件时，也支持同步收集来源数据了。
### Fixed
* 修复图库侧边栏在来源数据面板下由无选择项状态切换选择到集合项目时，没有自动切回主面板的问题。
* 修复打开内嵌的预览页时，切换图像显示不会使列表自动导航到新选择项的问题。
* **[CRX]** 修复Kemono站点无法使用相似项查找的问题。
* **[CRX]** 修复FANBOX站点中有时页面会错误标注的问题。该问题是有时作为cover的图像也会被包含进图像列表造成的。
### Optimized
* 元数据标签编辑器-多选模式：已持有的标签现在可以双击以添加到全部追加区了。
* 核心服务-日志视图现在可以选择文本了。
* 已支持`*.JPE`文件类型。

## [0.12.0] - 2024-12-27
### Changed
* 元数据标签-关键词功能更新: 关键词功能已可以记录、查询并快速选用过去使用的关键词了。其组件功能、样式也已重新设计。
* HQL语法更新: 注解查询语法已移除，取而代之的是评论文本匹配语法，用于匹配项目的标题、描述、关键词等。
* 主页重做: 主页内容与结构已重新设计。现在主页使用有限流式结构，移除了历史模块，更换了新的抽样推荐算法，增加了重置推荐内容功能。
* 元数据标签编辑器-多选模式三合一: 多选编辑标签时的添加、覆盖、删除模式现在已整合在一起。可以在一般模式下追加新标签或直接在列表中移除现有的标签，或者勾选覆盖模式，移除所有标签并追加标签。
### Removed
* 注解: 元数据标签的注解功能已被移除。原有的元数据标签已合并至关键词中。
* **[CLI]** Bulk功能更新: 与元数据标签功能同步更新，移除了注解功能。
### Fixed
* 修复“快捷整理”功能在特定情况下的一项内部错误，并在整理预览时将集合拆分为图像显示。之前该功能在整理集合且需要重新排序时，会因为输入的是集合而不是图像，导致在准备重排序时数量对不上，从而抛出错误。
* 修复拖拽项目到集合功能的一项问题。当从同一时间分区拖拽其他项目并指定插入位置时，会在重算排序时间时囊括从集合到插入项目的时间跨度，从而导致集合内项目大幅跨序。修复之后，计算排序时间时仅会基于原集合内项目的时间。
* 修复拖拽项目到集合功能的一项问题。当从不同时间分区拖拽其他项目且不指定插入位置时，无论插入项目相对于原项目是前是后，都会追加到末尾，且被插入的项目会变为按ID排序。修复之后，会基于原相对顺序进行插入。
* 修复文件格式转换功能失效的问题。之前修复大文件格式转换的OOM问题导致了此问题。
* 修复图库侧边栏在来源数据面板下切换选择到集合项目时，没有自动切回主面板的问题。
* 修复搜索框的输入建议候选项列表点击无效的问题。
* 修复在ImageView页面下，当UI折叠时，无法使用快捷键调整缩放的问题。
* 修复当焦点在按钮元素上时，SPACE等快捷键会使快捷键效果和按钮一同触发的问题。现已禁用按钮元素的普通按键响应。
* 修复ImageView页面的缩放控件会被侧边栏拖拽线覆盖，导致优先拖动了侧边栏而不能拖动缩放控件的问题。
* **[CRX]** 修复E-Hentai画廊没有tag时会造成来源数据收集异常的问题。
* **[CRX]** 修复E-Hentai的image toolbar在某些特定情况下会使用sample URL下载的问题。
### Optimized
* 主题详情页的子主题标签现在可以拖拽了。
* 相似项查找结果页面的网格模式现在和图库一样支持拖放图像来排序了。
* 相似项查找结果页面的网格模式、图模式现在也支持"打开"以进入ImageView页面了。
* 左下角的暂存区简化，去掉了菜单并将清空按钮放置到工具栏中。
* **[SERVER]** 尝试引入了HTTP log。现在会在日志中打印unsafe method HTTP log了。

## [0.11.1] - 2024-12-11
### Fixed
* 补充菜单栏被遗忘的来源数据条目。
* 修复StackedView详情页无法正确加载的问题。该问题是由于在该环境下未处理browser API的可选安装。
### Optimized
* 图库列表的右侧侧边栏现在会在宽度较宽时划分为两列。
* 集合详情页的右侧侧边栏现在也不会显示当前集合了。
* 右侧侧边栏的宽度记忆能力优化，现在会针对不同的场景分别记忆，图库、元数据、StackedView等不再会共享宽度了。
* 图库列表-侧边栏: 选项卡记忆能力优化，现在会针对不同的场景分别记忆(和上一条的侧边栏并不是相同的记忆策略)。
* 图库列表-侧边栏: 进一步优化侧边栏的布局；重新设计了部分位置的“描述”组件的外观。

## [0.11.0] - 2024-12-09
### Added
* HQL新字段: 为图库增加了新的可用于筛选的字段，包括分辨率宽度、高度、面积、宽高比、视频时长等。
* 核心服务日志: 现在可以在内嵌页面中查看核心服务的日志了，本地和远程模式皆可。查看日志的功能也包括了完整的日志列表，可以查看历史日志。
* 导航菜单右键: 现在可以右键点击左侧的导航菜单项，以快速执行在新标签页打开等操作。
* 图库列表-右键菜单-option扩展: 现在可以按住ALT或option按键后右键打开菜单，以使用某些选项的特殊版本。目前添加了“以推荐参数创建图像集合”、“以默认选项快捷整理”、“创建相似项查找任务”等功能。
### Changed
* 图库列表-侧边栏: 侧边栏的样式与逻辑已重新设计。
  - 通过选项卡按钮切换不同侧边栏选项卡(包括多选操作面板)的功能已移除。以后需要通过点击相应的功能模块/返回按钮在不同的选项卡之间切换，并且多选时固定为多选面板，不可再切换其他面板。
  - 主选项卡的排版已重新设计，标签列表已移至最下方，添加了收藏按钮，并且添加了“来源信息”和“关联项”的新模块，点击这些模块可以跳转到对应的选项卡。
  - 相似项查找页面的“项目处理”选项卡与它的多选操作面板合并为同一个了。
  - Tagme组件的样式已重新设计。
* 已删除列表-侧边栏: 在侧边栏添加显示更多已删除项的属性。
* 拖拽项目添加到集合的功能有所调整。当拖放项目到确定的位置时，将会将添加的项目移动到所选择的位置。即使添加到集合时选择的是另外的时间分区，也会保持插入的相对位置并挪动到新时间分区。
* 创建集合对话框的功能有所调整。当选定指定的集合时，不会再排除集合的原有项。在此之前，如果选择项中只包含目标集合的一部分，那么只有这部分会保留在此集合，其他项则会被移出集合。
### Removed
* 图库列表-右键菜单: “快捷排序”已经移除，该选项在此位置很少会用到，以后需要去多选面板使用此功能；“在侧边栏预览”开关已经移除，需要去右上角菜单使用此开关。
### Fixed
* 修复图库右侧边栏与选择项的一项问题。在从图库移除已选择项、刷新视图、清空选择项时，右侧边栏可能会在选择项已清空后依然保持对选择项的详情显示。该问题是侧边栏目标选择机制中，两个事件交叉混合响应导致的。
* 修复标签页访问顺序记忆功能的一项问题。该问题导致在关闭非激活标签页时，也会切换到前一个访问的页面。
* 修复对批量选择项的标签进行“覆盖编辑”时，对图像仍然不会完全覆盖其标签的问题。上次修复此问题时，仅修复了对集合的效果，未修复对图像的效果。
* 修复对批量选择项的标签进行“移除编辑”时，对集合子项的变更不会使集合中被导出的标签进行同步变更的问题。该问题是批处理中，REMOVE模式不会发送metaTag变更事件导致的。
* 修复多个大文件同时导入并触发文件格式转换时，内存溢出导致的一系列问题。为文件格式转换添加了并发限制，以避免大量文件同时转换造成内存不足。此外，在客户端添加了导入失败提示通知，避免静默错误。
* **[CRX]** 修复Kemono站点结构变更导致的content script失效。
### Optimized
* 在核心服务断开连接时，添加了一个覆盖全屏的警告信息。
* 右侧侧边栏现在会在同一个标签页下共享其宽度，以及全局记忆上次调整的宽度。
* 图库列表-点选组件，在Grid视图下，其显示的响应区域从“仅自身”扩展到“四分之一个项”，以优化点选组件的可视性。
## Performance
* 提升了主页加载的速度。首次加载后将主页缓存，再次加载时就不再需要进行繁重的查询了。不过这也会导致些许的行为变化。

## [0.10.3] - 2024-11-18
### Changed
* **[CRX]** E-Hentai重命名脚本功能: 已重新设计脚本实现。现在兼容了压缩包中会出现的两种文件名，避免了面对无序号文件名时的不可用问题；使用精确文件名称匹配，提高精确性和稳定性；在一个脚本中自动调用全部脚本，不再需要手动调用所有脚本，并且移除了统合脚本。
### Removed
* **[CRX]** Sankaku-优化UI显示-Book Legacy增强: Legacy Book已被网站移除，该功能已不可用，因此从优化项中移除。
### Fixed
* 修复“拖放插入修改排序时间”功能的一项问题。该功能在“自动调整排序时间间距”功能生效时，有可能为集合设置错误的排序时间，并导致后续的拖放插入乱序。该问题是由于自动调整排序后，设置集合时间时仍按旧时间点计算造成的。
* 修复“导出”功能在remote模式下，打包导出的zip压缩包没有扩展名的问题。
* 修复“导出”功能在local模式下，非打包导出时，文件没有导出的问题。
* 修复“导出”功能在目标文件已存在的情况下，提示的错误信息比较迷惑的问题。现在在大部分情况下会提示为“文件已存在”。
* 修复拖拽文件导入功能不可用的问题。由于Electron版本更新的breaking changes，文件拖拽的默认行为发生改变且获取文件路径的API发生变更。
* **[CRX]** 修复“相似项查找”功能对一部分图像会卡在截屏阶段的问题。这个问题是遗漏了对较小、不需要缩放的图像的处理导致的。
* **[CRX]** 修复“相似项查找”功能中的“在时间分区打开”按钮仅会打开时间分区页面，不会定位目标项的问题。
* **[SERVER]** 修复Bulk update API即使在没有更改metaTag时，也会在IllustUpdated事件中标注metaTagSot的问题。该问题会导致无意义的metaTag重算。
### Optimized
* “导出”功能：在打包导出时，将文件的修改时间设定为排序时间。
* “导出”功能：修复了导出对话框在某些情况下的错位UI，并且固定了导出对话框的高度。导出按钮现在会在执行时添加一个spin图标，以表示执行中。

## [0.10.2] - 2024-11-14
### Changed
* 标签页访问顺序记忆: 现在会记忆标签页的访问顺序，在关闭当前标签页后，退回上一个访问的标签页，优化多标签页浏览过程中的体验。
### Fixed
* 修复“自动调整排序时间间距”功能的一项设计缺陷。在将一组项插入另一组时间相同的项中间，或者将一组时间相同的项插入另一组项时，原先的顺序不会被保持，且容易乱序不可预测。改进后的算法在插入之前就做一次预调整，并在调整中保持刻意输入顺序。
* 修复在远程模式下，每日更新任务有时不会触发的问题。之前的初次触发间隔计算有误，使得触发时间落在了触发点的前一秒内，从而导致在每日任务不繁重的情况下主页刷新早于触发点而失效。
* 修复属性克隆功能中Tagme的克隆在merge模式下的行为异常。之前merge模式下将两个Tagme相加，然而这实际上导致大部分场景下等同于没克隆，Tagme的性质并不支持分位合并。现已移除Tagme属性的merge模式，它将总是覆盖。
* 修复相似项查找详情页的图像网格列表，当总项数超过100项时，100项之后的项加载不出来的问题。该问题是listview从数据列表截取数据的取值范围不对导致的。
* 修复后台任务列表中，项在黑暗模式下鼠标经过时的颜色不正确的问题。顺带更换了此处颜色的实现方式，使其与Button一致。
### Optimized
* 相似项查找-详情页-关系图：调整了图的生成配置，尝试改用circle布局，以改善force布局在重场景下的问题。

## [0.10.1] - 2024-11-07
### Changed
* 图像页面支持更多删除选项: 图像页面的右键-删除菜单项也添加了「彻底删除」的选项。
* **[CLI]** 设置项适配: 适配经过更改的设置项和站点选项等。
### Fixed
* 修复“自动调整排序时间间距”功能的一项设计缺陷。旧的算法可能在调整间距的过程中跨项插值，从而导致片区交界处出现乱序。已重新设计调距算法，预计可解决此问题。
* 修复对于E-Hentai的混合图集检测的分类判断错误导致的检测错误；修复了即使检测为混合图集却仍然消除了Tagme的问题；与此同时添加了一部分针对TAG类型标签的混合图集检测策略。
* 修复内置站点“Nijie”错误的页码类型。之前错误地将其标记为了“无页码”，正确的页码类型是“仅页码”。
* 修复设置-来源站点页面中，来源标签类型映射编辑器的表头列过于拥挤的问题。

## [0.10.0] - 2024-11-05
### Added
* 新选项“自动调整排序时间间距”: 在使用拖放、创建集合等快捷调整排序时间的功能时，项的时间间距会自动调整以保持一定距离，防止大量的图库项堆积在一起。
* **[CRX]** FANBOX来源数据支持: 新增了在FANBOX网站的来源数据信息支持和来源数据收集功能。
* **[CRX]** Kemono来源数据支持: 新增了在Kemono网站的几个特定service中的来源数据信息支持和来源数据收集功能。
* **[CRX]** 下载工具栏: 在几个受支持网站的详情页，为每个图像新增了下载工具栏，点击按钮即可触发下载。本质上是统合了之前形态各异的额外下载按钮。
* **[CRX]** FANBOX UI优化: 在FANBOX增加UI优化功能，可以追加显示creator的userId和creatorId。
* **[CRX]** Referrer Policy功能: 在几个受支持的网站增加referrer注入功能，开启时注入referrer: unsafe-url，使其支持详细的referrer信息。
* **[CRX]** 配置导入导出: 新增配置文件导入导出功能，可以将配置存储作为json文件导出备份。
### Changed
* 内置来源站点: 在App中增加了内置的来源站点，将这些站点添加到站点列表以启动内置站点。
  - 内置站点拥有预设好的配置参数不可调整。它的配置参数与CRX扩展保持一致。
  - 内置站点在一些特定情况下拥有特化的处理功能，例如混合图集检测功能，它不再作为一个选项而是作为特化功能与各个站点的特性有更好的配合。
  - 内置站点将会在来源信息栏展示其网站图标。
* 来源数据链接调整: 来源数据的“链接”字段已从每条数据的表单中移除。现在，链接总是根据来源站点的链接生成规则即时生成。
* 元数据标签命名限制调整: 元数据标签命名中的限制字符进一步减少，放开了对`' " .`符号的限制。
* **[CRX]** Website功能整合: 对现有的网站扩展功能进行了整合优化，移除了一部分已过时的无用功能，统合了剩下的现有功能并做了一些更新。
### Removed
* **[CRX]** 来源数据自定义相关更新: 新的设计思路使得程序和受支持站点的关联更密切了。因此，相当程度的自定义功能已被移除。现在在来源数据相关几乎已经没有自定义字段的能力了。
### Fixed
* 修复在远程模式下，每日更新任务有时不会触发的问题。该问题是由于更换了每日任务调度框架后，计算触发间隔时的一个疏忽造成的，这会导致触发时获取的时间点仍然在前一天，因此不能触发主页刷新的每日任务。
* 在相似项查找的后台任务模块，增加同步锁，防止出现工作线程卡死的问题。
* 修复“倒置排序时间”功能在对集合使用时，没有根据倒置后的顺序重新选择集合封面的问题。
* 修复侧边栏详情中的各类点击切换编辑组件(FormEditKit)中，在编辑模式下，从表单元素内向外拖拽，若拖拽落点在表单外会直接关闭编辑的问题。该问题是由于outside click的判定默认是基于mouseUp时刻的，已更改为mouseDown时刻。
* 修复侧边栏详情中的各类点击切换编辑组件(FormEditKit)中，在编辑模式下，若直接切换侧边栏的当前项，会直接丢失编辑内容的问题。该情况之前未做特殊处理，现已添加针对组件unmount时的提交操作。
* **[CRX]** 修复了在Pixiv下展开多页图像时，快速查找功能可能失效的问题。此问题本质上是查找时选取了全部图像列表，因此大多数时候被图像缓冲卡住了。
* **[SERVER]** 修复了调试模式+本地模式下的永久运行效果不完全生效的问题。该问题曾导致在所有会话断开时进程仍然会自动退出。
### Performance
* 大幅提升了使用来源标签进行关联查询时的速度。之前未建立从source_tag_id开始的查询索引导致这种情况下查询较慢，现已建立索引以优化。
### Refactor
* **[CRX]** 涉及来源数据、文件下载、站点定义等方面的代码已进行重构。由于在初版设计之后，扩展经过了多次较大规模的设计调整，代码中已留下很多冗余、老旧、有问题的设计。因此此次重构的主要目标是消除这些旧代码，提升整体设计感，一并修复旧设计引发的各种问题。
  - 重新设计了message模块中所定义的消息类型，使用更简洁清晰、功能明确的消息完成通信。
  - 调整了content scripts页面进行来源数据汇报的模型，现在由页面进行主动数据上报，并增加了一个来源数据管理模块进行相关的数据管理，供其他模块取用。
  - 重构了触发下载、重命名、来源数据收集时的代码。在通过工具栏下载时直接携带相关信息；将来源收集代码剥离并从分离的模块取数据，整个流程模型更简洁明确。
  - 从页面调用server模块时的调用方式调整，现在将借助代码结构的设计，通过消息从service worker发送请求，以此规避从前台页面发送请求时的协议问题。

## [0.9.1] - 2024-08-24
### Changed
* 侧边栏-相关内容-所属画集的画集卡片也使用了新样式。
### Fixed
* 修复了远程模式下后台定时调度不会触发/触发失败的问题。更换了更轻量级的ExecutorService作为调度触发器，并使用直接计算触发间隔的方式启动调度。
* 修复了客户端的文件监听器不稳定、容易重复触发的各类问题。更换了更好用的chokidar作为监听器。
* 修复了在切换到集合/画集等页面的Tab时，总是会重新加载侧边栏并发送额外的请求的问题。该问题是由于传送侧边栏内容的Teleport总是会在page deactivate时卸载导致。现在Teleport会正确区分何时卸载了。
* 修复了标签页导航框架中，页面缓存优化算法的两项bug。该算法会在特定的页面连续访问(如分区-分区详情-集合详情)中保留历史页面不卸载，从而在常用场景中优化历史记录回退/前进时的表现。
  - 在这之前，算法中的一处瑕疵导致对连续访问进行匹配时会进行跨项匹配(如图库-目录列表-集合详情仍能触发匹配)，这导致了在一定情况下会对历史中的页面进行重载，并在更特定的情况下由于重量级的调用导致显著影响性能。
  - 在这之前，算法还存在一项已知问题，即连续访问匹配是无状态的。这导致从其他页面导航到一组连续历史时会立刻重载这组连续历史的所有页面，反而增加了性能损耗。
* 修复了数据视图框架中，数据加载时的一项bug。在这之前，数据视图在刷新过程中的短暂时间内，使用任何同步交互都会被无效化或报告内部错误。现在所有的同步交互都更改为异步，在刷新完成之后继续操作。
* 修复了数据视图框架中，选择逻辑的一项bug。在这之前，数据视图刷新时，不会对选择项做任何变更，但刷新操作又经常涉及项的更替导致已删除的项不会从选择项中移除，经常引起后续的内部错误。现在在数据视图刷新同时对选择项也进行检查，确保视图范围内不存在的项会被及时移除。

## [0.9.0] - 2024-08-16
### Added
* 后台任务可视化模块: 现在可以实时获取后台任务的执行状况，包括它们的任务总数和已执行任务数。可以被看到的后台任务包括文件归档、文件生成、相似项查找、各类元数据导出。
* 远程模式: 添加了后台服务的独立部署模式，称之为远程模式。
  - 后台服务现在可以被编译打包为单独的jar文件、镜像，支持交叉编译，并部署在任意位置。客户端则可以连接到远端服务端来使用，就像一般C/S架构程序那样。
  - 在客户端，每个channel有独特且不可更改的连接模式。因此旧的channel将使用本地模式运行，不可变动，而创建新的channel时则可以选择连接到远程位置了。
  - 架构的分离使得一些模块的定位更加准确，现在文件缓存模块(Cache)和文件监听模块(PathWatcher)转而在客户端实现(即使本地模式也是如此)。由于已转移存储位置，相关配置项已失效需要重新设置。
  - 服务端的日志输出模式已更新，现在由服务端自行写入日志文件并按日期滚动，以后可以在存储目录找到历史日志了。
  - 文件的上传、下载、导出API在本地模式和远程模式做了两套实现，分别使用HTTP协议和本地文件读写完成。
  - 生命周期控制将仅作用于本地模式，在远程模式下将完全禁用。一部分已过时的生命周期控制API已移除。
### Changed
* 本地模式运行模式调整: 现在在本地模式下，后台服务将更加贴近于一个客户端的伴生进程，而不是独立静默执行的背景进程。
  - 后台服务根据连接数量进行响应，在所有连接断开时立刻终止，而不是继续在后台等待可能的连接。
  - 后台服务将不会再被正在执行的任务阻止关闭，现在当进程需要关闭时，所有后台任务都会被强制中断。
  - 移除了已经不再使用的client signal机制。
* 画集封面重新设计: 重新设计了画集列表和主页的画集封面。新的封面针对横向和纵向图像有不同的展示方式，且整体上更有设计感一些。
* 按来源顺序重设排序时间功能调整: 在“批量设置排序时间”、“快捷整理”、“画集/目录内部顺序”功能中，为“按来源顺序重设排序时间”功能引入了发布时间作为排序依据。当来源的sourceId不可排序时，将尝试使用发布时间进行排序。
* 来源数据ID调整: 它现在已支持区分大小写，以适应某些网站的ID写法。
### Fixed
* 修复获取illust概览API的查询中，元数据标签的isExported查询写法的错误。这导致在相关调用中无法区分出纯粹的导出标签。在多选标签编辑器的删除模式下，现在可以正确排除那些纯粹的导出标签了。
* 修复导入列表侧边栏的错误状况显示不全的问题，当发生预料之外的错误时，这里不会显示任何错误信息，让人摸不着头脑。
* 修复了在图库列表的快速预览中，视频下方的控制面板会被左右两侧的导航按钮区域阻挡的问题。
* 修复了当画集没有标题时，画集详情选项卡标题、菜单栏历史记录显示为空的问题。
* 修复了当图像还没有设置来源ID时，侧边栏仍会显示“编辑状态”和“编辑按钮”的问题。
* 修复了当导出图像时，在集合内的图像无法被正确预览和导出的问题。
### Optimized
* 调整了已删除文件清理任务的触发位置，现在它必定在文件归档任务之前进行，不会再有刚删除的文件得不到及时归档的情况了。

## [0.8.0] - 2024-06-17
### Added
* 快捷整理: 在图库/分区详情页选中多项后在右键菜单选用。此功能支持按照相似度对选中项进行分组，然后生成集合，并支持几项参数用于微调生成规则。
* 新选项“根据推导得到的父标签解决子标签冲突”: 在导入选项中启用，用于导入时自动标签推导，但也可用于批量编辑。
* 新选项“仅在角色标签变更时清理主题Tagme”: 作为“自动清理Tagme”的子选项，用于在自动清理时仅对character类型作出反应。同时，重写了大部分自动清理Tagme的逻辑以优化并适应新功能。
* 来源数据发布时间: 为来源数据添加了新字段publishTime(发布时间)，用于记录来源中此项的发布时间，作为字符串ID无法排序的补偿。
### Changed
* 来源数据ID范围扩充: 现在sourceId可接受由任意数字+字母组成的字符串了。由于其性质的变更，针对sourceId的查询行为也发生了变化，现在仅支持字符串类别的查询语法。在排序时，只有纯数字ID接受排序。
* HQL查询搜索策略: 调整了对作者/主题进行查询时的模糊搜索策略。现在关键字字段也将加入模糊搜索。
* 标签删除模式编辑器: 对多选项目进行的“删除模式”的标签编辑现在有了独立的UI。它将展示当前所选项拥有的全部元数据标签，并进行勾选删除，更加符合该功能的使用习惯。
* 在相似项处理中也可以「彻底删除」图像了。
* 注解作为不常使用的元数据基础项，已经移入“设置”作为一个选项页。
* 来源站点在“设置”中已经独立，成为一个单独的选项页。
### Fixed
* 修复了针对ID进行查询时的一项异常。当使用模糊匹配语法(如`1*`或`?1`)查询时，此查询操作会被扩展到宽泛模糊匹配(如`%1%%`和`%_1%`)，已修复使其仅能匹配受限的范围。
* 修复了在HQL模糊查询中的不正确转义问题。该问题曾导致在输入预测等场景输入如括号`()`等字符时，因错误转义导致无法进行任何预测。
* 修复了当删除图像时，其关联的元数据标签的引用计数没有被减少的问题。
* 修复了在主题详情页点击父主题时不进行跳转的问题。
* 修复了在元数据标签编辑器中，导出标签列表会错误显示类型为地址段的标签的问题。
* 修复了对多选项目进行的“覆盖模式”标签编辑仅会覆盖所涉及的类型的标签的问题。现在覆盖模式正确表现为清空之前的所有标签。
* 修复了导入列表页在加载时显示空列表的问题。额外为其添加了加载时的loading icon。
### Optimized
* 在StackedView视图关闭UI显示的模式下，左上角的“关闭视图”按钮也会在鼠标移过时显示了。
* 在搜索框查询时，当查询结果存在error时，不会再将查询结果计入查询记录。
* 优化了主题列表页的项中项数的列宽，使其能容纳更大的数字显示。
* 优化了元数据标签编辑器的来源推导模式下的展示列宽。现在恒定以1:1展示左右两列，并使过长的列换行显示。
* 优化了元数据标签编辑器的来源标签列表。现在可以双击以单独添加一个映射标签；类型过滤器会对映射标签生效，无符合类型的映射标签将被禁用。
* 集合详情页中，侧边栏的详情页不再会展示文件信息了，它并不是集合的必须属性。
* 侧边栏项目信息的Tagme信息已可以双击进入编辑模式；多选模式的侧边栏的Tagme编辑器得到优化，在内容未改变时不会再触发提交了。
### Refactor
* 重写了导入-自动标签映射功能中的Tagme消除算法和混合图集判定算法。现在根据全局所有的映射规则进行类型判别，并简化了处理逻辑。

## [0.7.2] - 2024-05-01
### Added
* 导入列表跳转时间分区: 在导入列表的右键菜单新增了“在时间分区显示”选项。
* 导航快捷键: 添加了Meta+ArrowLeft快捷键用于关闭ImageDetailView，使其可以与浏览器回退逻辑一致。
### Fixed
* 修复了相似项查找页面，右键菜单的“标记为收藏”选项点击无效的问题。
* 优化了创建集合/修改集合项时的event bus发送逻辑，消除了重复的事件，并将所有会引起列表变更的事件统一放到请求末尾发送。该优化应该能避免偶尔发生的“创建集合后自动刷新时无论是集合还是子项都没有出现”的问题。
## Optimized
* 微调了自动标签推导功能中的混合集判定界限。现在，拥有>=3个而不是2个author才会被认为是混合集。该调整针对那些偶尔多一个author的场景做优化。
* 优化了metaTag callout的点击弹出逻辑。现在会识别双击，仅在单击时略微延时弹出，并且在中速双击时撤销弹出，以优化使用体验。
* 创建author/topic之后，跳转到详情页的路由改用replace模式，这样不会在回退时再回到创建页面。
### Performance
* 为illust/book到tag/author/topic/annotation建立反查索引，以优化大批量查询项目的元数据时的性能。该优化能大幅提升批量修改元数据标签时的性能表现。

## [0.7.1] - 2024-03-14
### Fixed
* 修复了server构建过程的一个错误，该问题导致FFMPEG模块无法被调用。
* 修复了元数据标签编辑器的“覆盖”和“移除”模式不生效的问题。
* 修复了Annotation Picker的历史记录无效的问题。
* 修复了在特定情况下，全局对话框没有自适应高度而是充满全屏的问题。该问题的原因是监视Element尺寸的onElementResize不会在unmount时发送相关事件，从而导致高度响应不能正确进行。
* 修复了在选择项较多的情况下，删除操作会偶尔漏项的问题。
* 修复了在主题详情页中点击父/子主题会跳转到作者详情页的问题。
* 修复了在分区详情页变更collectionMode后返回分区列表页时，collectionMode没有同步更改的问题。解决方案是增加了一级tabStorage，用于在页面内同步并阻止页面间的同步。
* 修复了元数据标签编辑器的一处文本提示错误。当多选图库项目且有的项不存在时，编辑器提示的信息是“作者不存在”。
* 修复了元数据标签编辑器的来源推导模式下，更改选择列表不生效，总是添加所有项的问题。
* 修复了搜索框在选择预测结果时，光标位置可能不正确的问题。该问题的原因是未把引号的长度计入。
* 修复了导出时，选定的属于集合的图像被排除出导出范围的问题。
* 修复了FileArchive模块归档时的一个文件读取问题。之前没有忽略那些特殊文件(如.DS_Store)，导致这些文件可以被读取并引发异常。
* 修复了批量编辑时，当使用来源推导添加标签时，Tagme不会更新，也不会触发任何属性推导的问题。之前没有针对来源推导字段做这方面的任何更新判断。
### Optimized
* 优化了搜索框的Query Schema的显示。现在过多的标签会正确地换行，不会再顶破宽度显示；且如果单个标签过长可以横向滚动Schema区域，也不会顶破宽度。
* 进一步减少了拖拽项在选项卡上停留时的等待时间，只需要更短的时间就能切换至目标选项卡。
* 元数据标签编辑器在保存时会使按钮进入Loading状态作为进行中的提示，并阻止重复点击。
* 画集属性推导时的标签选择算法的对于author/topic的临界阈值进一步降低至5%。
* 优化了tag/topic/author进行更新时的条件判定，现在即使有patch字段也会比较实际值以确定是否真的有更新。该优化能减少不必要的更新和后续事件传播，尤其是在bulk update中。

## [0.7.0] - 2024-02-17
### Added
* 彻底删除&删除集合内项目功能: 删除图库项目时，在用于确认的MessageBox新增了两个选项：“彻底删除图像”将直接删除图像，不再放入「已删除」；“删除集合内图像”会在删除集合时将集合内的图像也一并删除(也会响应“彻底删除图像”选项)。
* 图库列表-点选组件: 新增了用于点选的复选框组件。Grid视图下位于左上角，Row视图下位于图片图标上，在鼠标移至其上方后显形。点击点选组件可直接将当前项加入或移出选择项，将点选组件拖拽到另一个项上，会将从源到目标的所有项加入选择项。
* 加载图标: 在图库、时间分区、时间分区详情页中，当查询加载时间稍长时，会在屏幕中央显示加载图标，以避免产生是否在加载的困扰。
### Changed
* 搜索框更新:
  - 添加了输入预测功能。现在，当输入Tag/Topic/Author(有前缀)、输入Annotation或SourceTag、输入排序项或枚举值时，将根据当前输入的内容预测当前项的值，并展开下拉列表供选择。
  - 添加了历史记录功能。当应用查询时，当前查询语句会被记录；当搜索框无任何文本时，会展开下拉列表供选择历史查询。
  - 搜索框的样式进行了更新，且展开Query Schema的状态被合并到了搜索框激活状态中。
  - Query Schema: 来源标签现已携带其site名称；元数据标签现已携带图标，且点击可打开预览浮窗。
  - Query Schema: 警告和错误信息已翻译为中文。
  - 在Query Schema下方添加了查询耗时信息，其值相当于schema解析耗时加上首段加载耗时。
* HQL模糊匹配方面的设计更新:
  - 与上述的输入预测功能对应的是，现在Element不再进行模糊匹配，也就是`A`仅匹配全名为`A`的项，想要模糊匹配必须显式给出`*`匹配符，如`*A*`。_Topic/Author/Annotation Dialect的名称搜索不受此影响。_
  - Illust Dialect: score添加了新别名`s`，与之对应的是SourceData Dialect的site移除了别名`s`；
  - Illust Dialect: ordinal已重命名为`order-time`(包括别名)，排序字段也做了此重命名；
  - Illust Dialect: extension已重命名为文件类型`file-type`(保留原名称作为别名)，支持枚举其可选值，使JPEG/JPG等价，以及添加了VIDEO/IMAGE作为类型别名；
  - Illust Dialect: 添加了新filter `source-title`；
  - SourceTag Element现在允许site/type进行模糊匹配，例如`p.c.A`可以匹配到`pixiv.character.A`了。
  - 排序字段order已重命名为`sort`(包括别名)。
* 元数据标签编辑器更新:
  - 批量编辑时，可以选择“覆盖”和“移除”两种编辑模式了。
  - 批量编辑已支持来源推导。批量编辑模式下的来源推导添加的是来源标签，在随后的更新中，仅将元数据标签添加给拥有已选择的来源标签的图像。
  - 数据库的检索功能已更新。现在在数据库的三种类型中都已支持通过上下方向键选择、回车键选定的检索模式，且通过回车选定时将自动清空搜索内容。
  - 数据库的主题类型中，已为所有主题添加了其parent root的标识，用于快速区分子主题的所属。
  - “按使用频率查看最近使用的标签”功能已移除。
* 相似项查找/快速查找: 在右键菜单新增了“在时间分区显示”系列功能，用于快速跳转到项所在的时间分区位置。
* 时间分区: 在时间分区列表的右键菜单新增“在新标签页/新窗口打开”功能，减少操作步骤，不必再复制标签页了。
* 图库列表-预览弹窗: 已重制。新的预览弹窗嵌入在布局中，在列表上方弹出显示。
* StackedView图像预览视图重新设计: 侧边栏挪到了右侧，且改用了与SideBar状态无关的独立的UI折叠开关。
* 快捷键调整: 将便签的快捷键替换为CTRL+U，以避免与Redo快捷键产生冲突。
* **[SERVER]** tag bulk API: 那些位于顶层的tag，现在会无视其顺序，只有children中的tag才会保持排序。该调整会影响CLI中apply的表现。
* **[SERVER]** 提取器历史记录API: 存取方式已调整。现在通过提取器选取注解时，将仅列出当前类型下的历史注解，不会再列出其他类型的注解了。_由于记录模式已重新设计，过去的历史记录已丢失。_
### Fixed
* 修复了zoomController区域会被识别为app拖拽区域的问题。
* 修复了在新窗口打开的图像预览页面能够被Escape键关闭并留下空白窗口的问题。

## [0.6.3] - 2024-01-27
### Changed
* 不为混合集做映射功能条件调整: 现在，根据metaTagType映射回的sourceTagType的数量统计，当copyright/ip任一数量>=2、character数量>=5、series/author/group任一数量>=2时，会将topic或author单独判定为混合集。判定数量是基于来源标签数量的，这样不会被映射的数量所干扰。
* 画集标签推导选取算法: 现在对于topic/author，它们的临界阈值降低至10%，也就是只要在10%的图像中出现就会被选取。tag依然保持30%。
* HQL查询: 优化了topic/author的查询。现在已在非精确字符串中支持使用otherName来检索。
### Fixed
* 修复了在历史记录之间导航时，若修改查询条件，则查询条件能正确同步到其他历史页面，但文本不能正确显示在查搜索框内的问题。
* 修复了VirtualView中的几项问题：通过历史记录导航后，即使当前数据量不够多也依然会出现滚动条；变更查询条件时，即使当前数据量不够多也依然会出现滚动条；变更查询条件时，滚动条立刻拉至顶端，导致有可能只看到一部分残留的旧数据。现在修复了滚动条不正确出现的问题，以及会在变更查询条件时立刻清空当前显示数据。
* 修复了编辑集合的标签时依然能看到“来源推导”选项卡的问题；以及当之前选项卡位于“来源推导”时编辑集合/批量编辑，将会自动切换至“数据库”选项卡而不是留在空屏。
### Optimized
* 修正macOS的窗口模式下边角处按钮的弧度，使其与窗口的边角弧度匹配。
* 调整主题列表页中各列的列宽，使count列不会被挤压，并使其余空间分配更合理。
* 来源标签列表中，右键菜单的复制选项已优化，现在直接在菜单项中写明要复制的内容是什么，并且添加了复制别名的选项，并且当标识编码/名称/别名重复时重复项不显示。
* 在来源数据列表通过“在图库查看此项目”跳转到图库时，现在将会把collectionMode修改为IMAGE，以避免出现找不到搜索结果的问题。此外，在此处也增加了右键菜单，用于在新标签页/新窗口打开。
* 在图像列表中，对拖放事件的发出做了优化。当仅选定1项或所选项连续时，若拖放终点位于所选项前后或之间，则不再会触发拖放事件。由此可以避免很多误拖放导致的悄无声息的事件(这些事件有可能不经意间更改了项的排序时间)。

## [0.6.2] - 2024-01-13
### Fixed
* 修复了在自动标签映射中的一项问题。若有多个来源标签映射至同一个标签，属性值无法正确应用，并造成导入崩溃。
* 修复了在App未启动时通过deep link调用，会在READY之前执行导致报错的问题。现在deep link的调用已经被延后到了READY之后。
* 修复了导入项目页面在初始加载过程中显示“空屏幕”的问题，以及纠正了之前为旧实现所写的用opacity实现的空屏幕显示切换方式。
* 修复了当通过画集列表页的右上角菜单新建画集时报错的问题。该问题是由一个MouseEvent被当作参数传入并最终被提交导致的。
* 修复了VirtualView中的两项问题：计算prefixWidth时未考虑aspect，从而导致在BookList中的排布错误；计算limit时直接使用height计算而不是使用top+height，导致可视区域的项数计算不符合预期，并在特定情况下会造成可视区域内缺项。
* 修复了对导入项使用“编写来源数据”功能时，输入值不会被校验的问题，并且在导入环节添加了新的错误捕获机制。该问题会导致当输入错误的来源数据值时，导入会无声地卡在处理状态。
* 修复了目录列表无法滚动而滚动了整个视口的问题。
### Optimized
* 启动屏的文本和布局微调，将文本移到了屏幕下方，且常态不再有文本显示。
* 图像列表-多选操作侧边栏中，当直接编辑时间分区和排序时间时，其默认值现在从选择项取得。
* 在时间分区详情页的右上角菜单补充了“更改图像”功能。

## [0.6.1] - 2024-01-10
### Fixed
* 修复“快速相似项查找”功能会将集合当成图像查出的问题。
* 修复在图像列表-Grid模式下，当将项拖拽到行末端时，会出现横向滚动条，并造成contentWidth和显示区域的offset/limit计算错误的问题。
* 修复作者/主题列表中，右键菜单的“在图库显示”功能跳转仅跳转页面，不改变查询条件的问题。
* 修复时间分区显示组件右键菜单的“查看时间分区”功能没有跳转到对应分区的详情页，而是跳转到时间分区列表页的问题。
* 修复了当集合/画集被删除时，其页面没有自动退出的问题。
* 修复了对导入项使用“编写来源数据”功能时，写入值会被保留至下一次编辑的问题。
* 修复“暂存区”按钮在暂存区页面激活时不会高亮的问题；同时，修复暂存区弹窗在Preview窗口中打开异常的问题。
### Optimized
* 标签选项卡的拖放机制更新: 在选项卡上停留的判定时间缩短；拖拽对象在选项卡上移动一定距离，将会提前判定激活该选项卡。此优化使得在使用中能更快捷地切换标签页。

## [0.6.0] - 2024-01-09
### Added
* 新的页面浏览架构: 
  - 应用程序的页面浏览架构已重新设计。现已添加多标签页和历史记录导航功能。
  - 添加多标签页设计，将顶栏作为标签页排布区域，可以同浏览器那样在一个窗口内打开多个页面了。多标签页控制也添加了相应的快捷键和菜单栏项。
  - 添加历史记录设计，在每个标签页内维护其浏览历史，可以同浏览器那样执行后退、前进操作了。不过，历史记录并不会缓存一个页面的全部状态，它只会缓存部分关键状态，在导航后还原。另外，对于某些特殊的浏览顺序(例如先打开主题列表，后打开主题详情页)，历史记录也会缓存全部状态，以在这些浏览模式中提高效率和使用体验。
  - 由于添加了多标签页，所有页面的顶栏都已重新设计，原本位于中间的搜索区域挪到了右边，原本位于左侧的回退按钮和标题已分别删除和并入标签页中。
  - 时间分区、作者、主题、相似项查找等页面的List-Detail架构现已拆分为独立的页面，使用通用导航来控制页面转移，不再需要使用之前的伪回退按钮了。
  - 原本位于叠层视图的集合、画集详情页现在已改为标准的页面，使用通用导航来控制页面转移。它们的侧边信息栏依然会正常挤占原先的导航菜单。
* 更改图像功能: 
  - 支持对图像进行重新处理。目前支持的能力仅有图像格式转换，且仅支持PNG to JPG这一种转换。
  - 在图库和集合详情页的右上角菜单，可以手动执行此操作。
  - 在导入设置已添加新的设置项，可以对新导入的项自动执行此操作。
* 快速相似项查找:
  - 在图库列表等位置，右键菜单的“相似项查找”功能已更新。它不再创建查找任务，而是执行快速查找。快速查找将打开对话框在前台，并等待查询结果。
  - 快速查找的查找逻辑比较简单，它仅以元数据标签为搜索依据，相似度为唯一比对手段，寻找所有与选择图像相似的图像，也不添加相似关系。
  - 快速查找的结果是暂时的，只能在对话框中即时获得，关闭后无法再使用，除非选择“在新标签页/新窗口查看结果”。
### Changed
* 导入项目列表功能优化: 现在对导入错误的情况、需要重设属性的情况做了功能方面的改进。
  - 现在支持选择某一种时间属性来重新生成排序时间，不再仅能使用默认时间类型，在需要灵活变更时间模式时的效率有所提升。
  - 对于因无来源而被阻止的项，现在支持直接放行，不再需要去设置里关闭开关再重试。
  - 对于因无来源而被阻止的项，现在支持直接编写其来源属性，不再需要重新导入或导入后单独处理。
### Fixed
* 修复了标签编辑时的一项错误，该错误使得无法在有一种标签的情况下添加或删除另一种标签，只能统一添加或删除。
* 在macOS下，预览弹窗的顶部原本属于标题栏的区域现在可以正常点击以关闭弹窗了。
### Optimized
* 对话框“新建集合”与“添加到集合”，每个分区的项数计算的方式优化。之前是统计选取项的数量，然而选取项为集合时只会记做1项，这不符合直觉。调整之后，可以正确统计为集合的项数了。这项优化会影响到默认时间分区的选择，使某些情况下的默认选择更合理。
* 相似项查找的“加入画集”功能，之前只会使用能被记录在关系图中的画集，但很多时候要加入的画集并不在关系图中。现在优化了此功能，将列出全部图像所属的所有画集。
* 相似项查找的右键菜单添加“暂存”功能，以便更复杂的存取操作。
* 相似项查找的连通分量划分得到优化。现在，拥有公共Book/Collection节点的分量会被合并为一条记录。不会再出现同一个集合的相关项被拆分到多条记录的情况了。
* 已删除项目的清理日期优化，deadline不再是当前时间减去clean interval，而是今天的0点时刻结合time offset再减去clean interval。这样的清理时间更统一，不会把一天中的删除项分开清理。
### Refactor
* QueryListView API增加了KEY参数以及使用KEY索引来搜索项的能力。绝大部分的sync find已替换使用新方法。此改进预计能在较大数据量时稍微提升检索速度。
* VirtualView组件与PaginationData API已重构。
  - 新的设计聚焦于组件的视口位置，由视口位置推导得到期望数据位置，是一个更加容易理解且更加符合响应式的设计。
  - 整体的数据控制流上移，主导权和不少功能转移到了上层的API中，这能避免一些上层无主动权导致的使用缺陷。借助新的设计，新的数据控制流也非常简单易懂了。
  - DataRouter和Navigation不再单独安装，整合到了PaginationData中。

## [0.5.1] - 2023-12-20
### Fixed
* 修复了集合详情页图像列表的一个比较刁钻的bug。应该是该bug导致了一些集合详情页的无法刷新、无法选定的奇怪现象。目前暂不能确定bug已全部找完，还有待继续观察。
  - 在有时进入此页面时，View组件的dataUpdate请求要先于singleton组件的初始化完毕，这导致在数据请求之后queryListview会发生一次FILTER_UPDATED事件，然后触发了一次paginationData的reset，造成记忆的数据范围被重置，但数据会在之后送达，且View组件没有重新提起dataUpdate请求，因此数据范围一直是null，这就造成之后的REFRESH事件无法被响应，也就无法刷新。
  - 目前的解决方案是：在id有数据之前，不显示View组件，这样View组件的dataUpdate请求一定在singleton组件初始化之后。能解决问题，但并不优雅。
* 补充了相似项查找-创建集合功能中，被遗漏的时间分区选择功能。现在它也会使用“添加到集合”对话框完成分区选择。
### Optimized
* 主页: 对内容生成的条件判定稍做了一些优化。
* 创建集合对话框: 稍微优化了默认选项。在选择集合模式下，现在默认选中项数最多的那个集合，而不是“新建集合”选项。
* 便签: 现在在详情页直接关闭页面也会保存，不再局限于失去焦点事件了。

## [0.5.0] - 2023-12-15
### Added
* 自动标签映射功能:导入时，可自动按导入项目的来源数据映射并添加标签。
* 新选项“向集合中添加不同分区的项时聚集集合”: 
  - 启用该特性后，新建集合或向集合添加新图像时，若图像属于不同的时间分区，则会弹出对话框，要求选择一个时间分区，将所有的项聚集到此时间分区内。
  - “新建集合”与“添加到集合”的确认检查对话框都已重新设计，保留了原功能的同时，加入了上述的时间分区选择功能。
* 新选项“将排序时间的更改同步至时间分区”: 启用该特性后，拖拽图像或手动编辑图像的排序时间时，会按照时间偏移量自动更新图像的时间分区。
* 图像列表-侧边栏: 现在对集合也显示文件信息。
* 图像列表-侧边栏: 时间属性的显示组件已重新设计。现在它通常仅显示排序和分区时间，且把这两个属性整合在一行了。
* 侧边菜单栏: 在时间分区子项后增加了“TODAY”标识，以醒目标记出属于今天的分区。
### Fixed
* 修复标签的来源标签映射无法正常添加和修改的问题。
### Optimized
* 主页: 图像的清晰度由sample调整为thumbnail。

## [0.4.3] - 2023-12-11
### Added
* **[SERVER]** 文件名来源解析API: 添加使用文件名查询对应的source identity和image id的API。
### Fixed
* 修复了视频播放时拖动定位响应慢的问题。问题出在默认块太小导致请求太多，因此调整了默认的chunk size。
* 修复主页骨架屏在暗色模式下并未使用正确颜色的问题。

## [0.4.2] - 2023-12-09
### Added
* 图像预览弹窗: 添加了左右导航按钮。
### Fixed
* 修复macOS下窗口无法全屏的问题。
* 修复在Input内输入Enter按键时，会触发两次update事件的问题。
* 修复当程序打开时，主页没有进入loading屏，而是会残留显示上一次的内容的问题。
* 补充了在分区详情页的图像列表被遗漏的快捷排序菜单。
* 修复了当删除图像项目时，其所属的集合的属性没有被重新导出的问题。
* 修复了当清除图像或集合项目的已有标签后，其并不能正确地从属性推导中获得新标签的问题。
### Optimized
* 修改了macOS下显示在菜单栏的App名称，去掉了"v3"字样。
* 调整了macOS下的UI，取消了系统原生的窗口顶栏，使用App内部top bar作为顶栏。
### Refactor
* 修改了macOS的构建流程，现在plist的版本号可以从client的版本号生成。

## [0.4.1] - 2023-12-05
### Fixed
* 修复HQL查询中的bookMember过滤器对集合无效的问题。
* 更新了属性克隆的策略，现在对于score/description/favorite这些属性，merge也将对其有效，已有的值不会被空值覆盖。
* 修复分区的图像列表页中，collectionMode切换无效的问题。
* 修复相似项查找-相似关系图中，macOS的command按键无法在选择中正确生效的问题。同时，调整区分了CTRL和SHIFT的行为，使得SHIFT不再会取消选择。
* 修复相似项查找-相似关系图中，如果没有访问过列表模式，则右侧侧边栏的预览功能不可用的问题。与此同时，也调整了该模式下右侧侧边栏预览功能的逻辑，现在它不再会在单选时造成导航了。
* 修复相似项查找-相似项列表中，右键菜单预览功能不可用的问题，以及补充了空格键触发的预览功能。
* 修复标签列表右键菜单的“在画集中搜索”功能无效的问题。
### Optimized
* 对首页做了优化。
  - 优化了内容生成逻辑，修掉了一些不合理的条件设定，使现在的内容生成更加合理。
  - 现在首页内容将在程序启动时生成，而不是首次访问首页时。在fastboot等状态下这会使首屏加载更快。
  - 首页的主题、作者、最近倒入、历史时间线等位置的图像列表调整为项目列表，也就是包含了集合/图像。这使得这些地方不至于被单个集合的图像占领。
* 主题、作者详情页: 的示例列表也调整为项目列表。这使得这些地方不至于被单个集合的图像占领。
* 侧边栏-多选操作: “设置时间分区”、“设置排序时间”按钮，现在完全变成下拉菜单，将原本的点按做成了下拉菜单的一个项，并且微调了一些项的顺序和名称。
* 快捷排序: 图像列表、集合详情页的右键菜单新增了“快捷排序”，可以从这里执行一部分批量排序功能。

## [0.4.0] - 2023-11-26
### Added
* 时间线新功能: 时间分区-时间线新增了右键菜单「复制日期列表」与「将日期列表添加到查询条件」的功能。
* 来源标签组件新功能: 来源标签列表(展示模式)新增了右键菜单「复制标识编码」「复制显示名称」的功能。
### Changed
* “导入项目”功能已重新设计。
  - 现在，向图库内添加文件时，文件会生成“导入记录”，并在准备完毕后立刻导入图库，不再有等待二次导入的过程。
  - 导入记录相比之前，更接近于一个文件导入的备用记录，记忆近期导入的文件的原始信息，并在必要时重新生成需要的来源、时间信息。
  - 导入记录不是持久可靠的：任何已准备完成的记录都会在程序退出后被清除。被清除的旧记录依然可以在“查看历史记录”功能查阅，但不可恢复，且会在数量达到上限或超出时间期限后被彻底清理。
  - 导入记录列表的功能更加轻量化，由于它不再具备“导入前的编辑区域”功能定位，很多复杂的操作都已被移除，如有类似需要，则使用最近导入的图库/时间分区完成近似操作。
* “相似项查找”功能已更新。
  - 相似项查找的各类模型和枚举已重新精简设计。
  - 相似项查找中的graph结构发生了变化。类似集合、画集、来源集合这类1toN结构现在独立出来了，成为了graph中的一个独立的点，而不是交织在它所有关联项的关系之间。这有助于在复杂结构中理清各类所属关系。
  - 相似项查找的filter选项与find选项都有更新。“来源相同“、”来源相近“现在被拆分成了的两个选项；”根据来源集合”、“根据来源关联项“等方式现在也支持作为filter选项了；现在支持将selector列表作为filter选项了。
  - 前端处理相似项结果的详情页已完全重制。旧的AB选择器+CompareTable的方式已被移除，现已替换为“图像列表”、“graph结构图”、“对比表”三种可切换的视图。同时也添加了与标准图像列表一致的侧栏，可以在相似项结果中对图像的其他元数据做更改了。
  - 结果处理模式已更新。现在每一步结果处理都实时反映到数据库中，而不是选择完所有操作后一次性应用。现在也可以实时获知结果是否已完全处理了，当完全处理后右上角的完成按钮会亮起提醒。
  - 在图像列表、标签作者列表添加了快捷进行相似项查找的右键菜单选项。
* 集合模式按钮扩展: 图像列表、时间分区等位置的集合模式按钮现在额外增加了「仅所有集合」「仅无集合图像」两种显示模式。
* 播放器控制快捷键: 视频播放器的前进/倒退快捷键由CTRL+L/R更改为L/R，更符合一般使用直觉。
### Bug Fixes
* 修复当创建的集合的图像有favorite标记时，集合可能不会被favorite标记的问题。该问题是集合创建时的favorite计算方法和别处未统一导致的。
* 修复当使用批量操作为项目添加元数据标签时，Tagme总是会被清空的问题。
* 修复集合的description不会被正确导出给它的子项的问题。该问题是集合更改时无法发出description更改事件导致的。
* 修复时间分区-时间线，在浅色模式下，背景色样式会出现两层分层的问题。该问题是遮罩层与反遮罩层的布局位置错误导致的。
* 修复主页-画集推荐中fav图标未与实际属性挂钩的问题，并更新了图标的样式。
* 修复Home、End、PageUp、PageDown按键仍能在对话框弹出时控制下层的列表滚动的问题。
* 在图像列表-侧边栏-来源数据面板新增了单独的编辑按钮，以避免在没有任何数据时无法通过双击进入编辑器的情况。
### Optimized
* 视频播放器的底部响应区域加高了一些，进度条高度也增加了一些，更利于选中。
* Tag的标签树现在会暂时记住它的折叠状态，在窗口内的所有TagTree处共享状态，直到刷新或窗口关闭。
* 搜索框的样式优化，现在文本不会再出现在按钮的后方，造成遮挡。

## [0.3.2] - 2023-10-26
### Added
* 集合-关联项: 为集合增加了关联的画集和目录，可以在集合的相关项目侧边栏确认到。实质上是集合下属的图像的关联画集和目录。
* 新的排序选项: 图像列表侧边栏的多选面板新增了新的排序选项，支持将时间分区或排序时间集中在分布最多的那天。
### Changed
* 集合-收藏属性: 增加了集合和图像之间收藏状态的联动。现在集合的收藏状态跟时间属性一样，视作图像的收藏状态的代理属性。任一图像标记为收藏就会使集合标记为收藏；集合的标记与取消会影响全部图像。
### Fixed
* 修复在暂存区移除项目时，仅移除当前所指项而不是所有选择项的问题。
* 设置-导入-来源数据解析规则，额外信息-标签的标签类型输入框已纠正为选择框。
* 在图像列表、集合详情页、时间分区等处通过拖放修改排序时间的功能已更改为后端实现，这改善了某些极端情况下的表现。  
插入在一个集合后时，现在将集合内的最后时间点而不是开始时间点作为端点，从而防止插入项入侵到集合区间内。  
此外，现在根据查询条件推断排序顺序，从而避免项数过少或连续多项的排序相同造成无法推断排序顺序的问题。

## [0.3.1] - 2023-10-25
### Changed
* 拖放排序: 在集合详情页的图像列表也支持拖放更改排序时间了。不过仅限于内部移动，从外部向集合内添加新项并不会造成重排序。
* 暂存区: 在暂存区弹窗的图像列表已支持向外拖曳。
* 集合-时间属性: 已支持修改集合的时间分区和排序时间。这两项属性的更改将直接更改下属图像的对应属性。
* 属性推导提示标记: 在图像/集合的详情侧边栏添加了一个有关属性推导的提示，当评分、描述、标签是推导获得的时，在后面显示一个EXPORTED小标记。
### Fixed
* 修复时间分区-时间线，在查询条件变化时，显示结果保持不变的问题。
* 修复在集合详情页修改集合信息时，会导致集合图像列表重新加载的问题。
* 修复各类虚拟滚动列表高度计算不正确的问题。之前调整了全局div的box-sizing，这造成了虚拟列表的实际高度错误。
### Performance
* 调整了相似项查找中信息缓存的实现方式，将illust/importImage的数据以每条为单位缓存；调整了来源相同项的查找逻辑，使其对全库执行扫描。以上优化大幅提升了相似项查找效率，使耗时下降85%左右。
### Refactor
* 更换了后端日志库，并调整了日志的输出格式。

## [0.3.0] - 2023-10-17
### Added
* 便签: 新增"便签"功能，允许记录一些笔记与待办事项。
* 导入规则: 附加规则中新增"将下划线转换为空格"的选项。
### Changed
* 刷新快捷键: 在时间分区列表新增快捷键CTRL+R用于刷新列表。
* 拖放排序: 优化了在图像列表、时间分区通过拖放修改排序时间的功能表现。
  1. 现在不再在前端去除begin和end端点，而是在后端完成，优化了端点排布，防止在过窄时中间值挤不下、首尾两项紧贴端点造成后续操作不便的状况；
  2. 当begin和end相距过远时不再无脑使用两端点计算中间值，而是贴近其中一端(离现有项较近的一端)逐秒排列，防止在这种长跨度中将间隔拉得过长。
### Fixed
* 修复导入文件-预设来源数据-来源标签无法被正确设置的问题。
* 修复暂存区弹窗中任意位置点击会导致弹窗关闭的问题。
* 修复文档切换页面时不会重置滚动条的问题。
* 修复侧边栏的tab按钮占据的宽度不能正确变化的问题。
* 修复时间分区-时间线，在所选月份变化时，没有正确追踪月份列表的项的问题。
* 使用Locate功能定位时，如果列表处于COLLECTION模式下且目标图像属于集合，将转而查找目标图像所在的集合。由此可避免在COLLECTION模式下无法定位/定位错误的问题。
## Optimizes
* 在各类图像列表、导入项目列表的右键菜单，重命名了一些菜单项，添加了"预览"功能，将"标记为收藏"改为复选框。在导入列表的菜单还添加了一些批量处理功能。

## [0.2.1] - 2023-10-10
### Fixed
* 修复在导入列表中的缩略图准备完毕时不会自动刷新的问题。
* 修复了当图库列表持有查询条件时，从别的地方点击定位某个图像时，会因为保留了旧查询条件而无法定位目标的问题。现在定位图像时，会清除旧的查询条件。
* 调整了时间分区页面的组件，懒加载分区列表页面，以减少在分区列表/分区详情间切换时造成列表页滚动位置异常的情况。
### Optimized
* 调整了时间分区-日历的样式，在dark mode下采取了不同的颜色策略，始终保持亮色文字不随背景色变化而翻转。
* 在时间分区-时间线新增了日期列表的选中效果，将选中当前月份的所有日期，以突出显示关注点，防止在长列表中找不到目标。
### Refactor
* 重写了时间分区-时间线的CSS，在dark mode下使用了不同的样式实现，保持相同效果的同时降低复杂度。

## [0.2.0] - 2023-10-09
### Added
* 刷新快捷键: 在图像列表、其他各类虚拟滚动列表新增快捷键CTRL+R用于刷新列表。与此同时，重新加载的快捷键已更改为CTRL+SHIFT+R，以避免与列表刷新的快捷键冲突。
* 预览快捷键: 在图像列表、导入项目列表新增快捷键快捷SPACE用于打开/关闭预览窗口。
* 拖放排序: 在图像列表、时间分区，现在也支持拖放功能了。实际作用是快捷更改排序时间，达成更改顺序的效果。
* 选项-核心服务: 支持直接查看核心服务日志与重启核心服务。
### Changed
* 图像列表-侧边栏: 调整为tab选项卡模式，并支持通过选项卡切换查看与图像详情页的侧边栏相同的内容。
* 图像列表-侧边栏: 多选操作面板已重新设计，优化了UI，减少了操作步骤，且增加了多种排序相关的菜单项。
* 图像列表-侧边栏: "相关内容"选项卡中，添加了画集的预览横幅。
* 导入列表-侧边栏: 与图像列表的改变相同，其多选操作面板也增加了多种排序相关的菜单项。
* 画集列表: 调整为单击选中、双击打开的模式，与图像列表一致。并且也为其增加了侧边栏。
* 元数据标签: "作者"的类型调整为"画师"、"社团"、"系列作品"。
* 评分组件: 样式调整，现已支持点击直接设置对应数值，且在边栏不再需要双击进入编辑模式了，可以直接点击设置值。
* 来源标签列表组件: 显示组件和编辑器组件都按照类型分组显示。
* 查询内容记忆: 在图像列表、时间分区、画集列表、来源数据列表，现在可以记忆查询内容，切换页面不会重置内容。其中图像列表和时间分区将共享相同的查询条件。
### Fixed
* 修复了在输入框的输入法状态下按下退格键时，会意外触发视图的回退的问题。
* 修复了"新建相似项查找"对话框中部分复选框选项无效的问题，以及"其他导入项目"类别的查找范围有时不生效的问题。
* 修复"相似项查找"结果页面中，"加入画集"在多选模式下不显示预设画集列表的问题。
* 修复"相似项查找"结果页面中的部分文本错误。
* 修复了"在新窗口打开"的集合页面时，无法使用预览弹窗的问题。
* 修复了ImageViewStack的当前项变化时，父级列表的选中项未随着一起变化的问题。
* 全局屏蔽了一部分快捷键的默认行为，以阻止这些快捷键在滚动列表中造成滚动效果，尤其是在一些情况下滚动列表并未聚焦但仍可被滚动。
### Optimized
* 已在边栏的大多数Input组件中支持按Enter直接提交编辑，以及在双击进入编辑模式时获得焦点。
* "在新窗口打开"的页面，现在默认关闭侧边栏。
* "在新窗口打开"的页面导航方式已调整为query参数，同时也修复了重新加载后页面空白的问题。
* 已可以记录窗口上次打开的位置和状态，下次打开同类窗口时将恢复上次的状态。
* 在ImageViewStack中，现在可以循环导航了(可以从第一项后退一位去到最后一项，或者反过来)。
### Refactor
* 时间分区的"时间线"、"日历"已重构，解决了之前的诸多易用性问题和细碎的bug，并新增了渐变颜色样式以直观地了解每个日期的项数。

## [0.1.5] - 2023-09-26
### Fixed
* 替换了后端dao层的date类字段使用的字段实现，改用了时区无关的实现，避免时区切换时可能的时间错乱。
### Optimized
* 在图像列表右键"创建图像集合"时，若所有图像都不属于任何集合，那么对话框默认不会再打开，而是直接创建集合。
* 在图像列表右键"创建画集"对话框中做了一些易用性优化。现在直接聚焦title文本框，可以在文本框中按下ESC了，可以在title文本框按下Enter以直接创建。
* 修改了集合的排序/分区时间选取逻辑。现在选取数量最多的分区时间，以及这个分区里最小的排序时间。
* 修改了向画集添加新图像时的排序逻辑。现在新图像总是按照排序时间排序，然后再插入指定位置。
* 调整了图像列表的"收藏"和"视频"图标效果，使其在同色背景下更易分辨。
* 调整了缩略图生成时透明背景填充的颜色，从黑色更改为极浅的灰色。
### Performance
* 调整了执行二次导入的代码结构，优化大量文件确认导入时的执行速度。
### Refactor
* 将FileCacheRecord表移动到system分库，以隔离存储数据和使用数据。

## [0.1.4] - 2023-09-24
### Changed
* 来源标签: 调整了来源标签的唯一定位方式。现在由(site, type, code)唯一定位一个标签。因此type不再能为空，且仅能从已配置的列表中选取。
* HQL: illust方言已支持通过`source part`和`source part name`筛选，并已支持使用site和type限定查询来源标签。
* **[SERVER]** 来源收集状态API: 现已支持查询相同页名的分页在不同ID下的收集情况。
### Fixed
* 在FileManager模块探查到了一个仍无法解决的bug。该bug的成因可能是SQL插入语句的返回值并不是该插入项的主键，且此问题极难复现。  
  目前仅是通过问题现象做出了以上成因推断，且为何出现完全未知，也无法得知是SQLite、Ktorm的问题还是存在意料之外的代码疏忽。  
  该问题会造成记录丢失，且有概率造成文件丢失。已添加插入语句后的ID检查，以尽量避免此问题。
* 修复SimilarFinder.RecordBuilder模块在新记录生成时，节点数量过多会导致栈溢出的问题。
* 修复对列表的项进行大量删除、更新操作时，有概率出现错位/已删除项残留/显示错误的问题。
* 修复写入大小写不同的code的来源标签/来源集合时，因程序处理不一致引起的错误。
* 修复缩略图生成模块的分辨率识别算法的一个问题。面对个别图片时，分辨率算法无法正确识别格式并抛出了异常。现已补充发生异常时的回退算法。
* 修复部分位置的缩略图分辨率宽高数值写反的问题。
* 修复画集内容页的图像列表无法显示的问题。
* 修复导入-来源数据解析规则-页名/分页页名留空时没有被判定为空项而是被当作空串的问题。
### Refactor
* 图像处理: 更换图像处理使用的库，以改善稳定性和Bug问题。同时略微优化了缩略图和图像指纹生成的流程。

## [0.1.3] - 2023-09-04
### Changed
* 通知(Toast): 可以通过拖曳来锁定或关闭通知了。同时也修复了最后一个通知关闭时的错误动画。
### Fixed
* 修复了一个png图像读取问题。该问题曾导致部分png图像BufferedImage.type无法正确读取，从而导致后续处理错误。
* 修复指纹生成模块未使用正确算法读取图片导致的问题。
* 修复部分对话框无高度的问题。
* 修复批量编辑标签时，重新选择标签按钮无效的问题。
* 修复导入列表文件数量从0到有时，导航栏数字显示Infinty的问题。
* 替换了后端所使用的时间类型，使用了更合理的Instant类型，避免时区切换时可能的时间错乱。
* 修复了HQL查询中的时间筛选未按照用户时区进行的问题。
* 修复了当来源数据由文件导入自动生成时，Links不会按规则自动生成的问题。
### Optimized
* 图库列表: 图像示意图(sample)/缩略图(thumbnail)的切换现在根据实际列宽来决定。

## [0.1.2] - 2023-08-31
### Added
* **[SERVER]** 来源收集状态API: 添加了用于快速查询指定来源数据是否已收集的API，用于协助Chrome Extension工作。
* 固定Token选项: 在后台服务相关选项中添加了固定Token的选项，用于协助Chrome Extension工作。
### Changed
* 暂存区: 允许在暂存区双击/回车打开详情页，并支持在暂存区内任意拖放以添加图像、改变图像排列。
* 首页: 不再显示没有内容的栏目。所有的栏目都没有内容时，添加了一个欢迎屏幕。
* 文件归档和磁盘删除: 现在删除文件不会稍后触发磁盘删除，所有的磁盘删除行为都仅在后端启动时发生。
### Fixed
* 修复了一个模块打包问题。该问题曾导致jave模块不可用，从而导致处理视频文件时报错失败。
* 修复了一个jpeg图像转码问题。该问题曾导致部分具有透明度的gif图像无法生成缩略图。
* 修复了一个jpeg图像读取问题。该问题导致部分jpeg图像在读入时无法正确处理颜色，从而输出颜色混乱的缩略图。
* 修复了一个渲染问题。该问题曾导致某些情况下img图像出现错误渲染。该问题是Electron本身的Bug，更新Electron之后解决问题。
* 修复了某些图像的缩略图所选择的实际图像不正确的问题。之前的缩略图选择算法存在问题，导致会选择到不存在的文件。
* 修复了"导入"选项中"分区判定时间段"无法设置的问题。
* 修复了文件跨硬盘移动时失败的问题。
* 修复了一个拖曳导入问题。该问题曾导致将文件拖曳到现有项目上导入时，会双倍导入。
* 修复了一个内部文件归档问题。该问题的出现条件较为复杂，但不是不可能出现。  
    1. 删除一个未归档的Block中的所有文件，会使该Block的directory留在原地。
    2. 下次启动时，FileGenerator模块认定latestBlock是上一个Block(或者当没有文件时是null)，且该Block的directory的存在使得模块认为应该执行对该Block的归档。
    3. 在归档开始之前，仍有时间添加文件，此时新添加的文件会添加到该Block，且在归档开始时将这些文件归档为zip，即使此Block没有满(或者说，与满不满根本无关)；
    4. 并且，由于FileManager模块未受影响，下一个文件仍然继续添加到该模块，导致出现latestBlock区块directory与zip同时存在的奇观。
    5. 主要问题来自FileGenerator对哪些Block需要归档划分不清，因此需要精细处理边界条件，使latestBlock默认值为1，且条件改为小于。
* 修复了"相似项查找页面"-列表的示意图显示区域，当示意图过多开始滚动时，整体布局失控的问题。
* 修复了"添加到集合对话框"-已存在集合的示意图列表，排列方向错误的问题。
* 修复了向导入列表大量添加文件时，有概率出现文件重复/错位显示的问题。
* 修复了删除导入列表的所有文件时，导航栏数字不清零的问题。
* 修复了"导出"功能非打包导出不可用的问题。
### Optimized
* 调整了项目/来源数据的标题/描述条目的字号，且描述条目现在有最大高度、可滚动、可正确显示空行。
* 调整部分对话框的高度为内容自适应高度。
* 修改默认字体为"Noto sans"。

## [0.1.1] - 2023-08-11
### Added
* 添加了向导页面和文档内容。
### Fixed
* 修复了后端事件总线在大量事件冲击时崩溃的问题。
* 修复了一个HQL查询中date类型的问题。该问题曾导致当使用诸如yyyy-MM-dd的单值日期时，查询匹配将只匹配该日期的00:00:00时间点，从而导致匹配不到预期中的任何项。
* 修复了一个属性推导时的问题。该问题曾导致当Collection需要从子项拷贝全部标签时，如果子项存在之前从Collection拷贝的标签，那Collection仍旧会拷贝这些旧标签。
### Optimize
* 图库列表: 在图库网格视图的列数大于8时，网格中的图像显示示意图(sample)。
### Performance
* 后台任务: 缩略图/指纹生成现在使用多线程并发处理，大幅提高处理速度。
### Refactor
* 版本号引用方式更新: client在现在从gradle读取server的最新版本号，而不需要手动填写。

# Changelog编写原则

更新日志通常情况记录从应用程序产品出发，面向用户时，每个版本中的变化情况。

每个版本包含以下几个部分:
* `Added`: 设计上新增加的功能。
* `Changed`: 对已有功能进行了设计上的变更、调整。
* `Removed`: 设计上被移除的功能。
* `Fixed`: 对不符合设计的地方进行修复。
* `Optimized`: 不涉及大的设计变更，但是进行了可察觉的、小规模的微型调整。
* `Performance`: 进行的性能优化，而非功能方面的改进。
* `Refactor`: 对代码、组织结构、编译等方面的改进、重构、优化，通常是不面向用户的。

在编写更新记录时，有时会选择为其添加前缀:
* 当涉及的内容是应用程序整体相关的时，不需要添加任何前缀。这符合大多数的情况；
* 当涉及的内容仅与一个部件高度相关(例如，CRX的变更、CLI的变更、仅对服务端做出而本体无感知的变更)时，需要为其添加`**[XXX]**`前缀，表明此内容的涉及部位。

在编写更新记录内容时:
* 尽量首先使用一个词或短句首先点名此条更新记录涉及的模块、组件或功能点。如果内容本身就已经很简略也可以不写。
* 随后，使用尽量控制在一行内的长句简述此条内容。如果想写的内容太多，也可以拆成多行多段。
* 在编写Bug Fixed记录时，应简述之前Bug造成的现象、预期中应有的表现，如有需要可以再补上Bug的产生原因和修复方法。