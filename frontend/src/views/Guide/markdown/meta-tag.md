Hedge拥有一套较为复杂的元数据标签(Meta Tag)体系，用于尽可能全面地描述图像，以及在搜索时提供最大的便利。元数据标签分为三类。

## 标签

一般标签(Tag)的作用是描述图像的类型、信息、内容等一切泛信息，它的组织形式也是最复杂的。

标签被组织成**标签树**。在「标签」页可以确认并编辑这棵标签树。向项目添加一个标签时，该标签的所有父节点都会被一同添加到项目中(也有例外，参考“地址段”、“虚拟地址段”)。这部分添加的标签是“被导出”的，不会与手动编辑的内容混淆。

标签有“标签”、“地址段”、“虚拟地址段”三种类型。
* **标签**: 最普适的标签类型，任何打算附加到项目上的标签，都应该使用这个类型。标签还有一个特性，它的标签名称必须是全局唯一的。
* **地址段**: 在组织标签树时，会有很多作为根枝节点的标签。这些标签不需要附加到项目上，只起到组织作用，这样的标签都应该使用这个类型。地址段的标签名称只需要在其父节点下唯一。
* **虚拟地址段**: 这是一个优化类型。标签和地址段都是可搜索的，尽管地址段不会显示在项目的标签列表中。但是，也有一些地址段真的就是纯粹的组织作用，不会有任何用它搜索的可能性，这样的标签都应该使用这个类型。

标签还有“**组**”这一特性。作为父节点的标签可以标记为“组”，这样它的子标签都会作为组成员。组起到唯一性约束：对于一个图像，同一组中的标签只应该出现一个。组还有一些额外的特性:
* **强制唯一组**: 一般的组的唯一约束仅作为建议作用，出现多个时给出警告；而强制唯一组的唯一约束则是强制的，出现多个时将报告错误。
* **排序组**: 组的成员是有顺序意义的。这意味着这个组的成员在搜索时可以使用范围匹配。

除以上外，标签还有如下属性:
* **标签名称**: 标签的显示名称，在列出标签的地方只显示这个。并且在进行唯一定位时，依靠的也是这个名称。
* **标签别名**: 标签的其他名称。在搜索中，使用标签别名一样可以定位标签。
* **描述**: 标签的描述信息。
* **链接**: 链接到其他标签。当标签被添加到项目时，所有它链接的标签也会一同添加。可以把这个功能作为“多个父标签”功能的替代实现。
* **来源标签映射**: 使标签映射到来源标签。详情参考「来源标签映射」部分。
* **示例**: 可以添加一组图像，作为标签的示例。

## 主题

主题(Topic)的作用是描述图像的题材信息，如图像包含的角色、角色所属的作品、作品所属的版权方。

版权方、作品、角色之间可以构成**局部的主题树**。在「主题」详情页，可以看到每个主题下属的子主题构成的树。向项目添加主题时，该主题的所有父主题都会被一同添加到项目中。这部分添加的标签是“被导出”的，不会与手动编辑的内容混淆。

不同主题类型的父子关系更为严格，它们需要遵循以下的关系约束:
* “版权方”不能拥有父主题，它一定是顶层主题。
* “作品”的父主题可以是版权方，也可以是另一部主题。(作品是可以有嵌套作品的，在有系列作品时就可以应用这一点)
* “角色”的父主题可以是版权方、作品、角色任意类型。(角色也是可以有嵌套角色的，在某角色存在一个独立性较强的衍生版本时就可以应用这一点)
* “版权方”、“作品”的名称，在各自的类型下必须是全局唯一的。
* “角色”的名称则比较特殊：顶层主题和版权方会使其下属的角色成组，在这个组的范围内，角色的名称必须是唯一的。角色属于哪个组可以在列表项上看到。

除以上外，主题还有如下属性:
* **主题名称**: 主题的显示名称，在列出主题的地方只显示这个。并且在进行唯一定位时，依靠的也是这个名称。
* **主题别名**: 主题的其他名称。在搜索中，使用主题别名一样可以定位主题。
* **描述**: 主题的描述信息。
* **描述关键字**: 也是描述信息，使用用空格分隔的词组描述。
* **来源标签映射**: 使标签映射到来源标签。详情参考「来源标签映射」部分。
* **评分**: 主题的评价等级。

## 作者

作者(Author)的作用是描述图像的创作者。

作者没有复杂的组织结构，每个作者标签都是平级的。

作者有如下属性:
* **作者名称**: 作者的显示名称，在列出作者的地方只显示这个。并且在进行唯一定位时，依靠的也是这个名称。
* **作者别名**: 作者的其他名称。在搜索中，使用作者别名一样可以定位作者。
* **类型**: 标记此作者的性质类型。可以分为“画师”、“工作室”、“出版物”三类。
* **描述**: 作者的描述信息。
* **描述关键字**: 也是描述信息，使用用空格分隔的词组描述。
* **来源标签映射**: 使标签映射到来源标签。详情参考「来源标签映射」部分。
* **评分**: 作者的评价等级。

## 来源标签映射

所有类型的元数据标签都有「来源标签映射」这一属性。它可以为标签设定一组映射的来源标签，从而建立元数据标签和来源标签之间的映射关系。

来源标签映射的主要作用是简化元数据编辑操作。在元数据标签编辑面板中，可以使用“来源推导”功能，从图像的来源标签中推导出可用的元数据标签。