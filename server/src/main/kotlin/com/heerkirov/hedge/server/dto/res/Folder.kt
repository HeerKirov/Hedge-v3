package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.enums.FolderType
import com.heerkirov.hedge.server.model.Illust
import java.time.Instant

data class FolderTreeNode(val id: Int, val title: String, val type: FolderType,
                          val imageCount: Int?, val pinned: Boolean,
                          val createTime: Instant, val updateTime: Instant,
                          val children: List<FolderTreeNode>?)

data class FolderRes(val id: Int, val title: String, val parentId: Int?, val parentAddress: List<String>,
                     val type: FolderType, val imageCount: Int?, val pinned: Boolean,
                     val createTime: Instant, val updateTime: Instant)

data class FolderSimpleRes(val id: Int, val address: List<String>, val type: FolderType)

data class FolderImageRes(val id: Int, val ordinal: Int, val filePath: FilePath,
                          val score: Int?, val favorite: Boolean, val tagme: Illust.Tagme,
                          val source: SourceDataPath?, val orderTime: Instant)

data class StagingPostImageRes(val id: Int, val filePath: FilePath,
                               val score: Int?, val favorite: Boolean,
                               val source: SourceDataPath?, val orderTime: Instant)
