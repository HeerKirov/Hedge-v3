package com.heerkirov.hedge.server.enums

/**
 * Tag.type: 用于标记tag的地址段类型。
 */
enum class TagAddressType {
    /**
     * 普通标签。
     */
    TAG,
    /**
     * 地址段。地址段不允许作为标签被引用，也不会出现在标签列表，但可以查询。
     */
    ADDR,
    /**
     * 虚拟地址段不会使用索引优化，因此查询效率有所损失，主要用于不需要索引的、用于分类归纳的地址段。
     */
    VIRTUAL_ADDR
}

/**
 * Tag.isGroup: 标记tag的组属性类型。
 */
enum class TagGroupType {
    /**
     * 默认不开启。
     */
    NO,
    /**
     * 开启组标记。
     */
    YES,
    /**
     * 强制组：使建议升级为强制。但对推导无效。
     */
    FORCE,
    /**
     * 序列化组：使组员的ordinal排序具有实际意义，可以使用比较查询来查询组员。
     */
    SEQUENCE,
    /**
     * 强制+序列化组。
     */
    FORCE_AND_SEQUENCE
}

/**
 * Author.type: author的类型。
 */
enum class TagAuthorType {
    /**
     * 未知类型。
     */
    UNKNOWN,
    /**
     * 画师。
     */
    ARTIST,
    /**
     * 社团。
     */
    GROUP,
    /**
     * 系列。
     */
    SERIES
}

/**
 * Topic.type: topic的类型。
 */
enum class TagTopicType {
    /**
     * 未知。
     */
    UNKNOWN,
    /**
     * 版权方。
     */
    COPYRIGHT,
    /**
     * 作品IP。
     */
    IP,
    /**
     * 角色。
     */
    CHARACTER
}