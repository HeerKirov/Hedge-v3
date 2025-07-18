没有关联关系的图像是彼此孤立的，此时的图库只不过是一个图片筐。在Hedge中，可以为图像添加多种不同的关联关系，根据不同的组织需要，将它们彼此连接起来。

## 集合

集合(Collection)是最基础的关联关系，它将一组关系紧密的图像聚合成组。集合最适合的应用场景是**组合关系紧密的小数量图像**(差分图像、连环画等)。

集合持有的额外信息不多。它之中的图像没有独立的排序，完全按照排序时间来排布。集合中必须有项，空集合会被自动删除。

集合没有单独的浏览区域，它与图像完全混合在一起，通过点击图库页顶栏的「集合/图像」按钮，可以切换“只显示图像”/“显示离散的图像与集合”两种模式。不过也因为如此，它有许多与图像相同的属性。

### 属性推导

集合是一组图像的群组，那么，集合具备它所属图像的一些特征，或者集合所属的图像具备它的一些特征，都是合理的需要。Hedge支持在一些关联关系之间的属性推导，在这之中关系最紧密的就是集合与图像。

属性推导是指，当关联一方的某项属性为空时，可以自动从另一方已填写的此属性中，推导出此属性的内容，并自动填写。需要注意的是，它：
* 不会直接填写属性值，只是显示出来，且有等价的作用。有关这一点，在编辑一项拥有推导值的属性时，就会发现它仍然是空的。
* 不会重复推导。由于推导只能基于手动填写的值，且只存在于空属性上，因此不会出现“A1-B-A2”间接获取属性/“A1-B-A1”重复获取属性这类问题。

对于集合与图像，支持属性推导的属性包括：
* **[元数据标签](#/guide?md=meta-tag)**: 图像与集合相互共享，图像会获得来自集合的全部元数据标签，集合会获得来自下属图像的全部元数据标签。
* **评分**: 图像没有评分时，获得集合的评分；集合没有评分时，获得其下属全部图像的评分的平均数。
* **描述**: 图像没有描述时，获得集合的描述。
* **收藏**: 下属图像有任一被标记为收藏时，集合就会被标记为收藏。
* **排序时间/时间分区**: 统计下属图像的时间分区，放入图像数量最多的那个时间分区，并获得在这个时间分区内最小的排序时间。

## 画集

画集(Book)是更进一步的关联关系，正如其名，它将更大量的图像有序地装订起来。画集最适合的应用场景是**组合大量成套图像，作为出版物阅览**(同人志、漫画、CG集等)。

所有的画集可以在主菜单的「画集」页浏览和搜索。画集是独立于图库的，不像集合/图像那样糅合在一起。画集也持有更多的独立属性，可以有自己的标题，其中的图像按照独立的顺序排序，与其排序时间无关。

*需要注意的是，现阶段画集并不支持重复图像，一张图像只能在一个画集中出现一次，重复添加图像会移动图像的位置。*

### 属性推导

画集同样支持一部分属性推导。只不过相比集合，可推导的内容较为有限。
* **[元数据标签](#/guide?md=meta-tag)**: 画集会获得来自所属图像的部分元数据标签。它的选取策略与集合略有不同，当一个标签在至少5%/30%(一般标签)的子项中出现时，此标签才会被放入画集的元数据标签列表。

## 目录

目录(Folder)则与其他关联关系不同，其他关联关系主要建立图像本身持有的关联，而目录则是面向用户生成聚合。目录最适合的应用场景类似于**传统的相册管理模式，按照喜好进行分类保存**，灵活地添加来自天南海北的不同图像。

目录本身采用类似文件系统的结构进行组织管理，在主菜单的「全部目录」页可以浏览和编辑全部的目录。目录树中存在两种单元，一种是**目录**，用于保存图像；另一种则是**节点**，不能保存图像，用于将目录按照树状结构组织起来。

目录本身除了其标题外，没有什么其他的属性，也没有任何元数据信息。目录中的图像按照独立的顺序排序，与其时间顺序无关；目录中的图像不支持重复，一张图像只能在一个目录中出现一次，重复添加图像会移动图像的位置。

## 关联组

关联组(Associate)是一种起到补充作用的关联关系，它可以为图像/集合添加一组关联的其他图像/集合。关联组不太常用，它可能的应用场合是**补充一些极端场景下的关联关系**(例如，A和B想要被关联在一起，但它们分属不同的集合，且它们的集合不太适合合并在一起)。

关联组是非常灵活的，一个图像所持有的关联组对象并不能视作一个集合(Set)，因为每个图像的关联关系都仅会传播至其直接关联的图像。例如，A关联了B、C，那么对于B和C，只能看到它们关联了A，而不能看到关联了彼此。这样的关联关系可以进行灵活的网状构建，但也要当心其复杂和混乱程度。