package com.heerkirov.hedge.server.enums

/**
 * Illust.type: 用于标记illust实体的类型。
 */
enum class IllustModelType {
    /**
     * image类型的illust，且不属于集合。
     */
    IMAGE,
    /**
     * image类型的illust，且属于集合。
     */
    IMAGE_WITH_PARENT,
    /**
     * collection类型的illust。
     */
    COLLECTION
}