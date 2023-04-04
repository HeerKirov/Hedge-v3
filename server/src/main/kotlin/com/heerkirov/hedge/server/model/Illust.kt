package com.heerkirov.hedge.server.model

import com.heerkirov.hedge.server.enums.FileStatus
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.utils.composition.Composition
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * 图片/集合(image/collection)的混合表。
 * 混合表有助于减少拆分表时的illust和tag relation冗余，并且还能保持在两个层级上的查询效率。
 *
 * 导出信息是为了区分从关联对象计算而来的属性以及手写的属性而做的冗余，并且会用于查询。
 *  - 编写图像的信息而没写集合的信息时，集合会采用某种算法聚合图像的此信息导出；
 *  - 编写集合的信息而没写某张图像的信息时，此信息会复制导出至图像；
 *  - 为了在相同的字段内查询，导出信息也会复制一份手写属性。
 */
data class Illust(val id: Int,
                  /**
                   * 对象类型。区分image和collection。
                   */
                  val type: IllustModelType,
                  /**
                   * [only image]所属父集合的id。
                   */
                  val parentId: Int?,
                  /**
                   * 关联的file record的id。
                   */
                  val fileId: Int,
                  /**
                   * [cache field]collection的关联的子项的数量。
                   */
                  val cachedChildrenCount: Int = 0,
                  /**
                   * [cache field]image的关联book数量，或者collection的子项中至少关联了1个book的项的数量。
                   */
                  val cachedBookCount: Int = 0,
                  /**
                   * 链接的sourceDataId。
                   */
                  val sourceDataId: Int? = null,
                  /**
                   * [cache field]链接的来源网站名称。
                   */
                  val sourceSite: String? = null,
                  /**
                   * [cache field]链接的来源网站的图像id。
                   */
                  val sourceId: Long? = null,
                  /**
                   * 链接的来源网站的二级图像id。有些会有，比如pixiv。
                   */
                  val sourcePart: Int? = null,
                  /**
                   * 简述信息。
                   */
                  val description: String = "",
                  /**
                   * 评分。
                   */
                  val score: Int? = null,
                  /**
                   * 喜爱标记。
                   */
                  val favorite: Boolean = false,
                  /**
                   * 一项todo标记，标出illust还有哪些元信息需要写。
                   */
                  val tagme: Tagme,
                  /**
                   * [exported field]导出的简述信息。聚合时采用。
                   */
                  val exportedDescription: String = "",
                  /**
                   * [exported field]导出的评分，聚合时取平均值。
                   */
                  val exportedScore: Int? = null,
                  /**
                   * [for image]用于日历分组的时间。
                   * [for collection][exported field]集合的值是导出值，取最早项。
                   */
                  val partitionTime: LocalDate,
                  /**
                   * [for image]用于排序的时间。
                   * [for collection][exported field]集合的值是导出值，取最早时间。
                   */
                  val orderTime: Long,
                  /**
                   * 真实的记录创建时间。
                   */
                  val createTime: LocalDateTime,
                  /**
                   * [for image]对图像进行替换更新的时间。
                   * [for collection]集合的内容发生变化的时间。
                   */
                  val updateTime: LocalDateTime) {

    open class Tagme(value: Int) : Composition<Tagme>(Tagme::class, value) {
        /**
         * 标签。
         */
        object TAG : Tagme(0b1)
        /**
         * 作者标签。
         */
        object AUTHOR : Tagme(0b10)
        /**
         * 主题标签。
         */
        object TOPIC : Tagme(0b100)
        /**
         * 原始数据。
         */
        object SOURCE : Tagme(0b1000)

        object EMPTY : Tagme(0b0)

        companion object {
            val baseElements by lazy { listOf(TAG, AUTHOR, TOPIC, SOURCE) }
            val empty by lazy { EMPTY }
        }
    }
}

/**
 * 关联组关联关系。此关系是双边的，每次总是维护成对的记录。
 */
data class AssociateRelation(val illustId: Int, val relatedIllustId: Int)

/**
 * 可导出的注解与illust的关联。
 */
data class IllustAnnotationRelation(val illustId: Int, val annotationId: Int)

/**
 * illust和author的关联关系。
 */
data class IllustAuthorRelation(val illustId: Int, val authorId: Int, /** 由规则导出而非用户编写的标签。 */val isExported: Boolean)

/**
 * illust和tag的关联关系。
 */
data class IllustTagRelation(val illustId: Int, val tagId: Int, /** 由规则导出而非用户编写的标签。 */val isExported: Boolean)

/**
 * illust和topic的关联关系。
 */
data class IllustTopicRelation(val illustId: Int, val topicId: Int, /** 由规则导出而非用户编写的标签。 */val isExported: Boolean)

/**
 * 时间分区。
 * 这个模型整体是为了冗余而设。
 */
data class Partition(/**
                      * 此时间分区的时间。
                      */
                     val date: LocalDate,
                     /**
                      * [cache field]此时间分区包含的项的总数。
                      */
                     val cachedCount: Int = 0)

/**
 * 导入表。
 * 在二阶导入逻辑中，用于存储第一阶导入的图像的信息。
 * 在后续的逻辑中，删除导入记录，并转换为illust记录。
 */
data class ImportImage(val id: Int,
                       /**
                        * 关联的文件id。
                        */
                       val fileId: Int,
                       /**
                        * 原文件名，包括扩展名，不包括文件路径。
                        * 从web导入时可能没有，此时填null。
                        * (一级文件信息，主要是从文件直接取得的原始文件信息，用于配合策略生成后续的二级文件信息。)
                        */
                       val fileName: String?,
                       /**
                        * 原文件路径，不包括文件名。
                        * 从web导入时可能没有，此时填null。
                        * (一级文件信息，主要是从文件直接取得的原始文件信息，用于配合策略生成后续的二级文件信息。)
                        */
                       val filePath: String?,
                       /**
                        * 原文件创建时间。
                        * 从web导入时可能没有，此时填null。
                        * (一级文件信息，主要是从文件直接取得的原始文件信息，用于配合策略生成后续的二级文件信息。)
                        */
                       val fileCreateTime: LocalDateTime?,
                       /**
                        * 原文件修改时间。
                        * 从web导入时可能没有，此时填null。
                        * (一级文件信息，主要是从文件直接取得的原始文件信息，用于配合策略生成后续的二级文件信息。)
                        */
                       val fileUpdateTime: LocalDateTime?,
                       /**
                        * 一阶导入此文件的时间。
                        * (一级文件信息，主要是从文件直接取得的原始文件信息，用于配合策略生成后续的二级文件信息。)
                        */
                       val fileImportTime: LocalDateTime,
                       /**
                        * 标记为tagme。
                        * 可以通过配置决定要不要给项目加初始tagme，以及该加哪些。
                        * (二级文件信息，经过处理后导出，或填写的，属于基础元信息的部分。)
                        */
                       val tagme: Illust.Tagme,
                       /**
                        * 来源网站的代号。
                        * (二级文件信息，经过处理后导出，或填写的，属于基础元信息的部分。)
                        */
                       val sourceSite: String?,
                       /**
                        * 来源网站中的图像id。
                        * (二级文件信息，经过处理后导出，或填写的，属于基础元信息的部分。)
                        */
                       val sourceId: Long?,
                       /**
                        * 来源网站中的二级图像id。来源网站没有这个信息时，写null。
                        * (二级文件信息，经过处理后导出，或填写的，属于基础元信息的部分。)
                        */
                       val sourcePart: Int?,
                       /**
                        * 用于日历分组的时间。
                        */
                       val partitionTime: LocalDate,
                       /**
                        * 用于排序的时间。
                        */
                       val orderTime: Long,
                       /**
                        * 初次创建的时间。
                        */
                       val createTime: LocalDateTime)

/**
 * 物理文件。
 * 此表的每条记录对应一个物理文件。对此表的ORM操作可封装为对物理文件的操作。
 *  - 记录对应的文件路径通过属性推出，为"${folder}/${id}.${extension}"。
 *  - 如果存在缩略图，缩略图路径为"${folder}/${id}.thumbnail.jpg"。缩略图只可能使用jpg格式。
 * 物理文件导入后需要经过后台任务的处理，以生成缩略图和其他详细信息。这个状态保存在status中。
 */
data class FileRecord(val id: Int,
                      /**
                       * 所在文件夹名称<yyyy-MM-dd>，一般用其添加日期作为文件夹名称。
                       */
                      val folder: String,
                      /**
                       * 文件扩展名，同时也表示此文件的类型。
                       */
                      val extension: String,
                      /**
                       * 此文件占用的磁盘大小，单位Byte。
                       */
                      val size: Long,
                      /**
                       * 缩略图占用的磁盘大小，单位Byte。没有缩略图时记0。
                       */
                      val thumbnailSize: Long,
                      /**
                       * 分辨率的宽度值。未填写时记0。
                       */
                      val resolutionWidth: Int,
                      /**
                       * 分辨率的高度值。未填写时记0。
                       */
                      val resolutionHeight: Int,
                      /**
                       * 文件的处理与可用状态。
                       */
                      val status: FileStatus,
                      /**
                       * 记录创建时间。
                       */
                      val createTime: LocalDateTime,
                      /**
                       * 上次更新物理文件的时间。
                       */
                      val updateTime: LocalDateTime)