package com.heerkirov.hedge.server.model

import com.heerkirov.hedge.server.enums.*
import java.time.Instant


/**
 * 关键字缓存列表。
 */
data class Keyword(val id: Int,
                   /**
                    * 关联何种标签。
                    */
                   val tagType: MetaType,
                   /**
                    * 关键字本体。
                    */
                   val keyword: String,
                   /**
                    * 关键字关联的标签数量。
                    */
                   val tagCount: Int,
                   /**
                    * 关键字上次被使用的时间。
                    */
                   val lastUsedTime: Instant)

/**
 * 内容标签。
 */
data class Tag(val id: Int,
               /**
                * 全局排序下标，由系统维护且无需对外展示，用于保持从标签树取出的部分列表的整体有序。从0开始。
                */
               val globalOrdinal: Int,
               /**
                * 排序下标，由系统维护，同一父标签一组从0开始。
                */
               val ordinal: Int,
               /**
                * 父标签的id。
                */
               val parentId: Int?,
               /**
                * 标签名。
                */
               val name: String,
               /**
                * 其他名称。
                */
               val otherNames: List<String>,
               /**
                * 隐式名称。指通过名称派生出的隐藏名称，可用于搜索。
                */
               val implicitNames: List<String>,
               /**
                * 标签类型。
                */
               val type: TagAddressType,
               /**
                * 标记为排序组。
                */
               val isSequenceGroup: Boolean,
               /**
                * 标记为覆盖组。
                */
               val isOverrideGroup: Boolean,
               /**
                * 描述。
                */
               val description: String,
               /**
                * 标签的颜色名称。
                */
               val color: String?,
               /**
                * 链接到其他标签。给出tag id列表。
                * 引入此标签时，链接到的其他标签会像此标签的父标签一样被导出。
                */
               val links: List<Int>?,
               /**
                * 标签的样例image。给出image id列表。
                */
               val examples: List<Int>?,
               /**
                * [exported field]关联的image的平均分。
                */
               val exportedScore: Int? = null,
               /**
                * [cache field]关联的image总数。仅包括image。只有TAG和ADDR会被计数，虚拟地址段是不会计数的。
                */
               val cachedCount: Int = 0,
               /**
                * 此标签创建的时间。
                */
               val createTime: Instant,
               /**
                * 此标签关联的image项上次发生更新的时间。
                */
               val updateTime: Instant)

/**
 * 作者标签。
 */
data class Author(val id: Int,
                  /**
                   * 标签名。
                   */
                  val name: String,
                  /**
                   * 其他名称。
                   */
                  val otherNames: List<String>,
                  /**
                   * 隐式名称。指通过名称派生出的隐藏名称，可用于搜索。
                   */
                  val implicitNames: List<String>,
                  /**
                   * 关键字。作用是一个更突出更简练的description。
                   */
                  val keywords: List<String>,
                  /**
                   * 分类。作者标签分为3类。
                   */
                  val type: TagAuthorType,
                  /**
                   * 评分。
                   */
                  val score: Int? = null,
                  /**
                   * 喜爱标记。
                   */
                  val favorite: Boolean = false,
                  /**
                   * 描述。
                   */
                  val description: String = "",
                  /**
                   * [cache field]关联的image的数量。
                   */
                  val cachedCount: Int = 0,
                  /**
                   * 此标签创建的时间。
                   */
                  val createTime: Instant,
                  /**
                   * 此标签关联的image项上次发生更新的时间。
                   */
                  val updateTime: Instant)

/**
 * 主题标签。
 */
data class Topic(val id: Int,
                 /**
                  * 全局排序下标，由系统维护且无需对外展示，用于保持从标签树取出的部分列表的整体有序。从0开始。
                  */
                 val globalOrdinal: Int,
                 /**
                  * 排序下标，由系统维护，同一父标签一组从0开始。
                  */
                 val ordinal: Int,
                 /**
                  * 标签名。
                  */
                 val name: String,
                 /**
                  * 其他名称。
                  */
                 val otherNames: List<String>,
                 /**
                  * 隐式名称。指通过名称派生出的隐藏名称，可用于搜索。
                  */
                 val implicitNames: List<String>,
                 /**
                  * 关键字。作用是一个更突出更简练的description。
                  */
                 val keywords: List<String>,
                 /**
                  * 父标签的id。
                  * 可行的父子关系有：
                  * copyright的父标签：null。
                  * work的父标签：copyright, work。
                  * character的父标签：character, copyright, work。
                  */
                 val parentId: Int?,
                 /**
                  * 父根标签的id。
                  */
                 val parentRootId: Int?,
                 /**
                  * 标签类型。
                  */
                 val type: TagTopicType,
                 /**
                  * 评分。
                  */
                 val score: Int? = null,
                 /**
                  * 喜爱标记。
                  */
                 val favorite: Boolean = false,
                 /**
                  * 描述。
                  */
                 val description: String = "",
                 /**
                  * [cache field]冗余的与此标签关联的image数量。
                  */
                 val cachedCount: Int = 0,
                 /**
                  * 此标签创建的时间。
                  */
                 val createTime: Instant,
                 /**
                  * 此标签关联的image项上次发生更新的时间。
                  */
                 val updateTime: Instant)
