package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.dto.filter.StagingPostFilter
import com.heerkirov.hedge.server.dto.form.StagingPostUpdateForm
import com.heerkirov.hedge.server.dto.res.ListResult
import com.heerkirov.hedge.server.dto.res.StagingPostImageRes
import com.heerkirov.hedge.server.exceptions.ParamRequired
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.manager.IllustManager
import com.heerkirov.hedge.server.functions.manager.StagingPostManager

class StagingPostService(private val illustManager: IllustManager, private val stagingPostManager: StagingPostManager) {
    fun list(filter: StagingPostFilter): ListResult<StagingPostImageRes> {
        return ListResult(stagingPostManager.count(), stagingPostManager.query(filter.limit, filter.offset))
    }

    fun update(form: StagingPostUpdateForm) {
        when (form.action) {
            StagingPostUpdateForm.Action.ADD -> {
                //添加新项目。添加时，结果按照表单的列表顺序排序。
                //也可以用来移动已存在的项目。
                val formImages = form.images ?: throw be(ParamRequired("images"))
                val images = illustManager.unfoldImages(formImages)
                if(images.isNotEmpty()) {
                    val imageIds = images.map { it.id }
                    stagingPostManager.add(imageIds, form.ordinal)
                }
            }
            StagingPostUpdateForm.Action.MOVE -> {
                //移动现存的项目。被移动的项目之间仍保持ordinal的顺序挪到新位置。
                //不能用来添加新项目，会被忽略。
                val formImages = form.images ?: throw be(ParamRequired("images"))
                if(formImages.isNotEmpty()) {
                    stagingPostManager.move(formImages, form.ordinal)
                }
            }
            StagingPostUpdateForm.Action.DELETE -> {
                val formImages = form.images ?: throw be(ParamRequired("images"))
                if(formImages.isNotEmpty()) {
                    stagingPostManager.remove(formImages)
                }
            }
            StagingPostUpdateForm.Action.CLEAR -> {
                stagingPostManager.clear()
            }
        }
    }
}