package com.heerkirov.hedge.server.dto.res

import java.time.Instant
import java.time.LocalDate

data class CollectionSituationRes(val partitionTime: LocalDate?, val collections: List<Collection>, val images: List<IllustSimpleRes>) {
    data class Collection(val collectionId: Int, val childrenCount: Int, val orderTime: Instant,
                          val childrenExamples: List<IllustSimpleRes>,
                          val belongs: List<Int>)
}

data class ImageSituationRes(val id: Int, val filePath: FilePath, val orderTime: Instant, val belong: IllustParent?)

data class BookSituationRes(val id: Int, val filePath: FilePath, val ordinal: Int?)

data class FolderSituationRes(val id: Int, val filePath: FilePath, val ordinal: Int?)

data class OrganizationSituationRes(val id: Int, val filePath: FilePath, val orderTime: Instant, val newOrderTime: Instant?)