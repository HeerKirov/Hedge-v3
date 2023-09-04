package com.heerkirov.hedge.server.model

import com.heerkirov.hedge.server.enums.*
import com.heerkirov.hedge.server.utils.composition.Composition
import java.time.Instant

/**
 * 注解。
 * 注解系统相当于是“给标签的标签”，直接关联到tag、topic或author。
 * 不能直接关联到illust等，因为它不是标签。不过，标记为导出的注解会以导出的形式关联到illust，此时可以使用注解查询语法。
 * 非导出注解不会导出给images，因此只能用于标签查询。在image查询中也可用，但因为会严重拖慢性能而受到限制。
 */
data class Annotation(val id: Int,
                      /**
                       * 注解名称。
                       */
                      val name: String,
                      /**
                       * 可导出至image的注解。
                       */
                      val canBeExported: Boolean,
                      /**
                       * 此注解的分类。
                       */
                      val type: MetaType,
                      /**
                       * 此注解的详细适用范围。
                       * 详细限定此注解只能适用于什么类型的标签。
                       */
                      val target: AnnotationTarget,
                      /**
                       * 此注解创建的时间。
                       */
                      val createTime: Instant) {

    open class AnnotationTarget(value: Int) : Composition<AnnotationTarget>(AnnotationTarget::class, value) {
        object TAG : AnnotationTarget(AnnotationTargetValues.TAG)
        object ARTIST : AnnotationTarget(AnnotationTargetValues.ARTIST)
        object STUDIO : AnnotationTarget(AnnotationTargetValues.STUDIO)
        object PUBLISH : AnnotationTarget(AnnotationTargetValues.PUBLISH)
        object COPYRIGHT : AnnotationTarget(AnnotationTargetValues.COPYRIGHT)
        object IP : AnnotationTarget(AnnotationTargetValues.IP)
        object CHARACTER : AnnotationTarget(AnnotationTargetValues.CHARACTER)
        object EMPTY : AnnotationTarget(0b0)

        companion object {
            val baseElements by lazy { listOf(TAG, ARTIST, STUDIO, PUBLISH, COPYRIGHT, IP, CHARACTER) }
            val empty by lazy { EMPTY }
            val tagElements by lazy { listOf(TAG) }
            val authorElements by lazy { listOf(ARTIST, STUDIO, PUBLISH) }
            val topicElements by lazy { listOf(COPYRIGHT, IP, CHARACTER) }
        }
    }

    private object AnnotationTargetValues {
        const val TAG = 0b1
        const val ARTIST = 0b10
        const val STUDIO = 0b100
        const val PUBLISH = 0b1000
        const val COPYRIGHT = 0b10000
        const val IP = 0b100000
        const val CHARACTER = 0b1000000
    }
}

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
                * 标签类型。
                */
               val type: TagAddressType,
               /**
                * 组功能标记。
                * 组标记使一个地址段/标签的直接子节点被视作组员，建议只出现最多其一(添加二级子节点会推导出直接子节点，因此同样有效)。
                */
               val isGroup: TagGroupType,
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
 * 注解与tag的关联。
 */
data class TagAnnotationRelation(val tagId: Int, val annotationId: Int)

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
                   * [cache field]冗余存储关联的注解。在author列表中会用到，防止N+1查询。
                   */
                  val cachedAnnotations: List<CachedAnnotation>? = null,
                  /**
                   * 此标签创建的时间。
                   */
                  val createTime: Instant,
                  /**
                   * 此标签关联的image项上次发生更新的时间。
                   */
                  val updateTime: Instant) {
    data class CachedAnnotation(val id: Int, val name: String)
}

/**
 * 注解与author的关联。
 */
data class AuthorAnnotationRelation(val authorId: Int, val annotationId: Int)

/**
 * 主题标签。
 */
data class Topic(val id: Int,
                 /**
                  * 标签名。
                  */
                 val name: String,
                 /**
                  * 其他名称。
                  */
                 val otherNames: List<String>,
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
                  * [cache field]冗余存储关联的注解。在author列表中会用到，防止N+1查询。
                  */
                 val cachedAnnotations: List<CachedAnnotation>? = null,
                 /**
                  * 此标签创建的时间。
                  */
                 val createTime: Instant,
                 /**
                  * 此标签关联的image项上次发生更新的时间。
                  */
                 val updateTime: Instant) {
    data class CachedAnnotation(val id: Int, val name: String)
}

/**
 * 注解与topic的关联。
 */
data class TopicAnnotationRelation(val topicId: Int, val annotationId: Int)