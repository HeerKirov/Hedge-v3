在不同的位置，HQL支持不同的关键字和语法范围。此章节详尽地列出每一个位置可用的关键字、排序和元素类型。

## 图库

支持元素:
* **元数据标签**: 支持通过一般标签语法`A`查询标签；
* **注解**: 支持通过注解语法`[A]`查询注解；
* **来源标签**: 支持通过来源标签语法`^A`查询来源标签。

可用关键字:
* **收藏**: `favorite`, `f`  
    筛选收藏或非收藏项。无运算符和运算对象。
* **画集成员**: `book-member`, `bm`  
    筛选项是否是画集成员。无运算符和运算对象。
* **ID**: `id`  
    根据项目ID。运算对象为patternNumber。
* **评分**: `score`  
    根据评分。运算对象为number。
* **分区时间**: `partition`, `pt`  
    根据分区时间。运算对象为date。
* **排序时间**: `order-time`, `order`, `ot`  
    根据排序时间。运算对象为date。
* **创建时间**: `create-time`, `create`, `ct`  
    根据创建时间。运算对象为date。
* **修改时间**: `update-time`, `update`, `ut`  
    根据修改时间。运算对象为date。
* **描述**: `description`, `desc`  
    根据描述。运算对象为string。
* **文件类型**: `file-type`, `type`, `extension`, `ext`  
    根据文件类型。可以使用扩展名(`jpeg`与`jpg`是等价的)，或使用`video`, `image`(`img`)获取视频、图像类型。
* **文件大小**: `filesize`, `size`  
    根据文件大小。运算对象为size。
* **来源ID**: `source-id`, `^id`  
    根据来源ID。运算对象为patternNumber。
* **来源分页**: `source-page`, `^page`  
    根据来源分页。运算对象为patternNumber。
* **来源分页页名**: `source-page-name`, `^page-name`, `^pn`  
    根据来源分页页名。运算对象为extractString。
* **来源站点**: `source-site`, `^site`  
    根据来源站点。运算对象为extractString。
* **来源标题**: `source-title`, `^title`  
  根据来源数据标题。运算对象为string。
* **来源描述**: `source-description`, `^description`, `source-desc`, `^desc`  
    根据来源数据描述。运算对象为string。
* **Tagme**: `tagme`  
    根据Tagme。运算对象可以为string(限定author, topic, tag, source)，也可以为无。

可用排序项:
* **ID**: `id`
* **评分**: `score`, `s`
* **分区时间**: `partition`, `pt`
* **排序时间**: `order-time`, `order`, `ot`
* **创建时间**: `create-time`, `create`, `ct`
* **修改时间**: `update-time`, `update`, `ut`
* **来源ID**: `source-id`, `^id`
* **来源站点**: `source-site`, `^site`

## 画集

支持元素:
* **元数据标签**: 支持通过一般标签语法`A`查询标签；
* **注解**: 支持通过注解语法`[A]`查询注解。

可用关键字:
* **收藏**: `favorite`, `f`  
    筛选收藏或非收藏项。无运算符和运算对象。
* **ID**: `id`  
    根据项目ID。运算对象为patternNumber。
* **评分**: `score`  
    根据评分。运算对象为number。
* **图像数量**: `image-count`, `count`  
    根据画集内的图像数量。运算对象为number。
* **创建时间**: `create-time`, `create`, `ct`  
    根据创建时间。运算对象为date。
* **修改时间**: `update-time`, `update`, `ut`  
    根据修改时间。运算对象为date。
* **标题**: `title`  
    根据标题。运算对象为string。
* **描述**: `description`, `desc`  
    根据描述。运算对象为string。

可用排序项:
* **ID**: `id`
* **评分**: `score`, `s`
* **图像数量**: `image-count`, `count`
* **创建时间**: `create-time`, `create`, `ct`
* **修改时间**: `update-time`, `update`, `ut`

## 来源数据

支持元素:
* **元数据标签**: 支持通过一般标签语法`A`查询来源标签。

可用关键字:
* **来源站点**: `source-site`, `src`, `site`
    根据来源站点。运算对象为extractString。
* **来源ID**: `source-id`, `id`  
    根据来源ID。运算对象为patternNumber。
* **标题**: `title`  
    根据标题。运算对象为string。
* **描述**: `description`, `desc`  
    根据描述。运算对象为string。
* **编辑状态**: `status`, `st`  
    根据编辑状态。运算对象为string(限定not edited, edited, error, ignored)。

可用排序项:
* **来源ID**: `source-id`, `id`
* **来源站点**: `source-site`, `src`, `site`

## 主题/作者

支持元素:
* **元数据标签**: 支持通过一般标签语法`A`模糊查询名称。
* **注解**: 支持通过注解语法`[A]`查询注解。

## 注解

支持元素:
* **元数据标签**: 支持通过一般标签语法`A`模糊查询名称。
