package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dto.res.IllustRes

class AssociateManager(private val data: DataRepository) {

    /**
     * 获得illust关联的所有illust列表。
     */
    fun getAssociatesOfIllust(illustId: Int): List<IllustRes> {
        TODO()
    }

    /**
     * 设置illust所关联的illust列表。这会将关联同时传播到所对应的illust上，或者取消旧illust对应的关联。
     */
    fun setAssociatesOfIllust(illustId: Int, relatedIllustIds: List<Int>) {
        TODO()
    }

    /**
     * 从另一个illust拷贝所需的associate。
     */
    fun copyAssociatesFromIllust(illustId: Int, fromIllustId: Int) {
        TODO()
    }
}