package com.heerkirov.hedge.server.model

import com.heerkirov.hedge.server.enums.FolderType
import java.time.LocalDateTime

/**
 * 文件夹。
 */
data class Folder(val id: Int,
                  /**
                   * 标题。
                   */
                  val title: String,
                  /**
                   * 类型。区分为节点、(真实)文件夹、(虚拟)查询三种。
                   */
                  val type: FolderType,
                  /**
                   * 父节点id。
                   */
                  val parentId: Int?,
                  /**
                   * [cache field]父节点名称列表。
                   */
                  val parentAddress: List<String>?,
                  /**
                   * 局部排序顺位。从0开始。
                   */
                  val ordinal: Int,
                  /**
                   * pin标记及其排序顺位。pin指将文件夹pin在侧边栏上永久显示。没有pin时填null。
                   */
                  val pin: Int?,
                  /**
                   * [cache field]Folder类型包含的图片数量。
                   */
                  val cachedCount: Int?,
                  /**
                   * 文件夹创建时间。
                   */
                  val createTime: LocalDateTime,
                  /**
                   * 文件夹中的项的更改时间/query查询表达式的更改时间。
                   */
                  val updateTime: LocalDateTime)

/**
 * 文件夹中的image的关联关系。
 */
data class FolderImageRelation(val folderId: Int,
                               val imageId: Int,
                               /** 此image在此文件夹中的排序顺位，从0开始，由系统统一调配 **/
                               val ordinal: Int)