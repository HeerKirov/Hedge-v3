package com.heerkirov.hedge.server.dto.res

import java.time.LocalDateTime

data class CollectionSituationRes(val id: Int, val childrenCount: Int, val orderTime: LocalDateTime,
                                  val childrenExamples: List<IllustSimpleRes>,
                                  val belongs: List<Int>)

data class ImageSituationRes(val id: Int, val filePath: FilePath, val orderTime: LocalDateTime, val belong: IllustParent?)

data class BookSituationRes(val id: Int, val filePath: FilePath, val ordinal: Int?)

data class FolderSituationRes(val id: Int, val filePath: FilePath, val ordinal: Int?)