package com.heerkirov.hedge.server.model

import java.time.Instant

/**
 * 画集。
 */
data class Book(val id: Int,
                /**
                  * 标题。
                  */
                 val title: String,
                /**
                  * 描述。
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
                  * [cache field]画集封面的文件id。
                  */
                 val fileId: Int?,
                /**
                  * [cache field]画集中的图片数量。
                  */
                 val cachedCount: Int = 0,
                /**
                  * 记录创建的时间。
                  */
                 val createTime: Instant,
                /**
                  * 画集的项发生更新的时间。
                  */
                 val updateTime: Instant)

/**
 * 画集中的image的关系。
 */
data class BookImageRelation(val bookId: Int,
                             /**
                              * 关联的image id
                              */
                             val imageId: Int,
                             /**
                              * * 此image在此画集中的排序顺位，从0开始，由系统统一调配，0号视作封面
                              * */
                             val ordinal: Int)

/**
 * 可导出的注解与book的关联。
 */
@Deprecated("annotation is deprecated.")
data class BookAnnotationRelation(val bookId: Int, val annotationId: Int)

/**
 * book和author的关联关系。
 */
data class BookAuthorRelation(val bookId: Int, val authorId: Int,/** 由规则导出而非用户编写的标签。 */val isExported: Boolean)

/**
 * book和tag的关联关系。
 */
data class BookTagRelation(val bookId: Int, val tagId: Int,/** 由规则导出而非用户编写的标签。 */val isExported: Boolean)

/**
 * book和topic的关联关系。
 */
data class BookTopicRelation(val bookId: Int, val topicId: Int,/** 由规则导出而非用户编写的标签。 */val isExported: Boolean)