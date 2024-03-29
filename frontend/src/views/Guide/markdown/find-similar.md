相似项查找(Find Similar)的目标是通过图像之间的组织关系和连结，发现内容近似、来源上有关联，但缺少对应关系的图像。

在主菜单「相似项目」一页，可以看到找到的相似项目，或手动发起新的相似项查找计划。

### 查找方式

在主菜单「相似项目」页的右上角点击「手动新建查找任务」，可以看到发起一个查找计划所需的全部选项。我们可以结合选项来说明相似项查找的查找方式。

#### 第一步：选定启动范围

查找的第一步是选定启动范围。查找计划是从启动范围开始，只会去搜索选定图像的相似项。

手动新建查找任务给出了所有可用的启动方式。
* **图像**: 直接给出特定的图像，从它们开始。
* **时间分区**: 选择指定时间分区下的所有图像。
* **主题/作者**: 选择指定主题/作者标签关联的所有图像。
* **来源标签**: 选择指定来源标签关联的所有图像、导入项目。来源标签需要选择一个站点，然后给出一系列的标签编码。

#### 第二步: 选定搜索范围

有了启动项之后，下一步是确定这些项要去哪里搜索可能的相似项。

右侧的“相似项查找范围”列出了所有可选的搜索范围。
* **当前待处理的所有项**: 在启动范围中的所有项都会被考虑。
* **相同时间分区的项**: 对于每个项，与其在同一个时间分区的项都会被考虑。
* **相同作者/主题的项**: 对于每个项，与其拥有任一相同作者/主题标签的项都会被考虑。
* **来源类型过滤器**: 对于每个项，与其拥有任意一个相同指定来源标签类型的标签的项都会被考虑。听起来比较复杂，但实际上是与作者/主题过滤类似的功能。(例如，指定"artist"类型后，与这个项有相同"artis"类型来源标签的项都会被考虑了)
* **相同来源、ID的项**: 对于每个项，与其来源ID一致、分页不同的项都会被考虑。
* **相同来源集合的项**: 对于每个项，与其位于同一个来源集合的项都会被考虑。
* **来源关系相关的项**: 对于每个项，其来源关联项所关联的所有项都会被考虑。

#### 第三步: 相似性判断

现在我们有了启动项列表，对于每个启动项也知道了它们要与哪些项作比对。现在则是要明确根据什么规则做判断。

右侧的“查找选项”列出了所有可用的判断规则。
* **内容相似度判断**: 使用指纹算法，对比两张图像之间的相似度，可以发现内容接近的图像。
* **来源一致性判断**: 对比图像的来源站点、ID、分页、页名。当站点+ID+分页/站点+页名完全一致时，直接将两张图像判定为相同项。_这个查找选项的比对范围比较特殊，它不使用搜索范围内的项，而是直接全库搜索。_
* **来源近似性判断**: 对比图像的来源站点、ID、分页。当站点+ID一致而分页不一致时，认为两张图片关系相近。
* **来源关系判断**: 如果两张图像通过来源关联项相联系，则将两张图像判定为关系相近。
* **来源集合判断**: 如果两张图像属于同一个来源集合，则将两张图像判定为关系相近。

可以发现有一部分判断同时出现在了搜索范围和相似性判断中。这取决于你希望的对这些关系类型的处理方式。如果倾向于认为它们就代表关系相近，则在相似性判断选项中启用；如果仅认为它们只是用于联系，最终相似性判断还是要依赖相似度，则在搜索范围选项中启用。

### 解决相似项

当存在两张图像，它们之间**存在至少一种相似关系**(如内容接近、关系相近)，且它们之间**没有任何已存在的关系**(如位于同一个集合)，则认为存在应当解决的相似项。  

多个这样的有联系的图像会形成一张图(Graph)，并转换为一条待解决的记录。  

所有的记录都会列出在「相似项目」页。在相似项详情页面，可以查看相似项的详情，并着手进行处理。  

在节点之间添加新的已存在关系(如加入同一个集合)，或者干脆移除一些节点，就会“破坏”图的节点之间的连接。根据上面提到的相似性判断方式，当图中不存在任何有效的相似关系时，就认为相似项已经被解决了。

右键点击图像/节点，或者在右侧侧栏的相似处理面板，可以选择以下选项进行处理。
* **属性克隆**: 当一张图像是另一张的上位替代时，可以使用克隆功能将元数据转移，并移除旧图像。
* **加入集合/画集**: 为多张图像添加组织关系。
* **忽略关系**: 将多张图像间的关系标记为忽略。被标记为忽略的图像将被视作存在组织关系了，下次扫描将不会再扫出来。
* **删除项目**: 直接移除图像，达到移除节点的效果。

只有在相似项详情页面执行的上述操作才会影响图的实时结构。在图库的其他位置，也可以手动做处理，但相应的变化不会反映到结果图中。

如果不添加任何解决方案就点击“完成”，这条记录会被直接移除，但下次扫描仍然可能扫描出这部分相似关系。

### 设置项和自动计划

在「设置」-「相似项查找」，可以设定相似项查找时的默认参数。默认参数也会用于各处的相似项查找快捷入口。

勾选“自动执行相似项查找”，将会在项目导入时，自动对新导入的项目执行相似项查找。
