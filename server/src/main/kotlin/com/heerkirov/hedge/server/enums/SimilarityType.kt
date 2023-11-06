package com.heerkirov.hedge.server.enums

enum class SimilarityType {
    /**
     * source site&id/part完全一致，即两者是完全相同的来源。
     */
    SOURCE_IDENTITY_EQUAL,
    /**
     * source site&id一致，即两者来自同一个来源ID。
     */
    SOURCE_IDENTITY_SIMILAR,
    /**
     * source relation存在关联，或source book一致。
     */
    SOURCE_RELATED,
    /**
     * 被relation mark手动标记，且标记为「完全相同」。
     */
    RELATION_MARK_SAME,
    /**
     * 被relation mark手动标记，且标记为「内容近似」。
     */
    RELATION_MARK_SIMILAR,
    /**
     * 被relation mark手动标记，且标记为「关系接近」或未表明关系。
     */
    RELATION_MARK_RELATED,
    /**
     * 相似度指数过高，基本可以认为是同一个。
     */
    TOO_HIGH_SIMILARITY,
    /**
     * 相似度指数较高，超过阈值。
     */
    HIGH_SIMILARITY,
    /**
     * 已存在的关系：位于同一个集合、画集或关联组，或者已被标记为忽略。
     */
    EXISTED
}