package com.heerkirov.hedge.server.model

import com.heerkirov.hedge.server.enums.MetaType
import com.heerkirov.hedge.server.enums.SourceEditStatus
import com.heerkirov.hedge.server.enums.SourceMarkType
import java.time.LocalDateTime

/**
 * 来源信息。
 * 分离存储illust关联的来源信息，与image类型的illust 1:1存储。
 */
data class SourceData(val id: Int,
                      /**
                        * 来源网站的代号。
                        */
                      val sourceSite: String,
                      /**
                        * 来源网站中的图像id。
                        */
                      val sourceId: Long,
                      /**
                        * 原数据的标题信息，有些会有，比如pixiv。
                        */
                      val title: String? = null,
                      /**
                        * 原数据的描述信息，有些会有，比如pixiv。
                        */
                      val description: String? = null,
                      /**
                        * 原数据的关系信息。
                        */
                      val relations: List<Long>? = null,
                      /**
                        * 关系信息的数量的缓存。
                        */
                      val cachedCount: SourceCount,
                      /**
                        * 内容是否为空的缓存标记。
                        */
                      val empty: Boolean,
                      /**
                        * 此项的编辑状态。能自动转换。
                        */
                      val status: SourceEditStatus,
                      /**
                        * 初次建立的真实时间。
                        */
                      val createTime: LocalDateTime,
                      /**
                        * 上次更新的真实更新时间。
                        */
                      val updateTime: LocalDateTime) {

    data class SourceCount(val tagCount: Int, val bookCount: Int, val relationCount: Int)

}

/**
 * 来源信息的book。
 */
data class SourceBook(val id: Int,
                      /**
                       * 来源网站的代号。
                       */
                      val site: String,
                      /**
                       * 编码。
                       */
                      val code: String,
                      /**
                       * 标题。
                       */
                      val title: String)

/**
 * source image与book的关联。
 */
data class SourceBookRelation(val sourceDataId: Int, val sourceBookId: Int)

/**
 * 来源信息的标签。
 */
data class SourceTag(val id: Int,
                     /**
                      * 来源网站的代号。
                      */
                     val site: String,
                     /**
                      * 标签编码。
                      */
                     val code: String,
                     /**
                      * 标签的显示名称。
                      */
                     val name: String,
                     /**
                      * 标签的其他名称。
                      */
                     val otherName: String?,
                     /**
                      * 标签分类。
                      */
                     val type: String?)

/**
 * source image与tag的关联。
 */
data class SourceTagRelation(val sourceDataId: Int, val sourceTagId: Int)

/**
 * 原始标签映射。
 * 记录由来源信息的tag到app tag的映射关系，符合映射表的tag会放入建议列表。
 */
data class SourceTagMapping(val id: Int,
                            /**
                             * 来源网站的代号。
                             */
                            val sourceSite: String,
                            /**
                             * 来源tag id。
                             */
                            val sourceTagId: Int,
                            /**
                             * 转换为什么类型的tag。
                             */
                            val targetMetaType: MetaType,
                            /**
                             * 目标tag的tag id。
                             */
                            val targetMetaId: Int)

/**
 * 来源信息的手动关系标记。此关系是双边的，每次总是维护成对的记录。
 */
data class SourceMark(/**
                       * 关联的一方。
                       */
                      val sourceDataId: Int,
                      /**
                       * 关联的另一方。
                       */
                      val relatedSourceDataId: Int,
                      /**
                       * 关联标记类型。
                       */
                      val markType: SourceMarkType,
                      /**
                       * 标记记录时间。
                       */
                      val recordTime: LocalDateTime)