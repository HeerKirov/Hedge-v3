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
    COLLECTION;

    /**
     * 将此类型直接转换为illustType。
     */
    fun toIllustType(): IllustType {
        return if(this == IMAGE || this == IMAGE_WITH_PARENT) {
            IllustType.IMAGE
        }else{
            IllustType.COLLECTION
        }
    }
}