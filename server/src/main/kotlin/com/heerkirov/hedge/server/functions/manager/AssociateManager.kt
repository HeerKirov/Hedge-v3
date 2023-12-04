package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.AssociateRelations
import com.heerkirov.hedge.server.dao.FileRecords
import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.dto.res.IllustRes
import com.heerkirov.hedge.server.dto.res.newIllustRes
import com.heerkirov.hedge.server.exceptions.ParamError
import com.heerkirov.hedge.server.exceptions.be
import org.ktorm.dsl.*

class AssociateManager(private val data: DataRepository) {
    /**
     * 获得illust关联的所有illust列表。
     */
    fun getAssociatesOfIllust(illustId: Int): List<IllustRes> {
        return data.db.from(Illusts)
            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
            .leftJoin(AssociateRelations, AssociateRelations.relatedIllustId eq Illusts.id)
            .select(
                Illusts.id, Illusts.type, Illusts.exportedScore, Illusts.favorite, Illusts.tagme, Illusts.orderTime,
                Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName,
                FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { AssociateRelations.illustId eq illustId }
            .orderBy(Illusts.orderTime.asc())
            .map(::newIllustRes)
    }

    /**
     * 设置illust所关联的illust列表。这会将关联同时传播到所对应的illust上，或者取消旧illust对应的关联。
     */
    fun setAssociatesOfIllust(illustId: Int, relatedIllustIds: List<Int>) {
        if(illustId in relatedIllustIds) throw be(ParamError("associates"))
        val newAssociateIllusts = relatedIllustIds.toSet()
        val oldAssociateIllusts = data.db.from(AssociateRelations)
            .select(AssociateRelations.relatedIllustId)
            .where { AssociateRelations.illustId eq illustId }
            .map { it[AssociateRelations.relatedIllustId]!! }
            .toSet()

        val adds = newAssociateIllusts - oldAssociateIllusts
        if(adds.isNotEmpty()) {
            //执行双向添加
            data.db.batchInsert(AssociateRelations) {
                for (addRelatedIllustId in adds) {
                    item {
                        set(it.illustId, illustId)
                        set(it.relatedIllustId, addRelatedIllustId)
                    }
                    item {
                        set(it.illustId, addRelatedIllustId)
                        set(it.relatedIllustId, illustId)
                    }
                }
            }
        }

        val deletes = oldAssociateIllusts - newAssociateIllusts
        if(deletes.isNotEmpty()) {
            //执行双向删除
            data.db.delete(AssociateRelations) { it.illustId eq illustId and (it.relatedIllustId inList deletes) }
            data.db.delete(AssociateRelations) { it.illustId inList deletes and (it.relatedIllustId eq illustId) }
        }
    }

    /**
     * 从另一个illust拷贝所需的associate。
     */
    fun copyAssociatesFromIllust(illustId: Int, fromIllustId: Int, merge: Boolean = false) {
        val fromAssociateIllusts = data.db.from(AssociateRelations)
            .select(AssociateRelations.relatedIllustId)
            .where { AssociateRelations.illustId eq fromIllustId }
            .map { it[AssociateRelations.relatedIllustId]!! }

        val illusts = if(merge) (fromAssociateIllusts + getAssociatesOfIllust(illustId).map { it.id }).distinct() else fromAssociateIllusts

        setAssociatesOfIllust(illustId, illusts)
    }
}