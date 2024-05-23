package com.heerkirov.hedge.server.components.backend.similar

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.FileFingerprints
import com.heerkirov.hedge.server.dao.IllustAuthorRelations
import com.heerkirov.hedge.server.dao.IllustTopicRelations
import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.events.QuickFindChanged
import com.heerkirov.hedge.server.utils.Similarity
import com.heerkirov.hedge.server.utils.tools.ControlledLoopThread
import org.ktorm.dsl.*
import java.util.concurrent.ConcurrentHashMap

sealed interface QuickFindSelector

data class QuickFindSelectorOfIllusts(val illustIds: List<Int>) : QuickFindSelector

data class QuickFindSelectorOfFingerprint(val fingerprint: Fingerprint, val authors: List<Int> = emptyList(), val topics: List<Int> = emptyList()) : QuickFindSelector

data class QuickFinderResult(val id: Int, val selector: QuickFindSelector, var succeed: Boolean, var imageIds: List<Int>)

class QuickFinder(private val data: DataRepository, private val bus: EventBus) : ControlledLoopThread() {
    val list = ConcurrentHashMap<Int, QuickFinderResult>()
    val queue = mutableListOf<QuickFinderResult>()
    val memories = mutableListOf<QuickFinderResult>()
    @Volatile var nextId = 0

    override fun run() {
        val model = queue.firstOrNull()
        if(model == null) {
            this.stop()
            return
        }

        process(model)

        bus.emit(QuickFindChanged(model.id))

        queue.removeFirst()
    }

    private fun process(model: QuickFinderResult) {
        /* 思路：
         * 首先将selector统一转化为起始条件(fingerprint)和查询条件(authors, topics，只支持这两个)；
         * 然后，将查询条件转换为待查询的项列表，由于条件少，这非常简单；
         * 然后，用起始条件的指纹依次与待查询项匹配，挑选出符合匹配的项。
         */
        val (fingerprints, authors, topics) = translateSelector(model.selector)

        val tasks = taskSequence(authors, topics)

        val imageIds = tasks.filter { (_, f) -> fingerprints.any { Similarity.matchSimilarity(it, f) > 0 } }.map { (id, _) -> id }.toList()

        model.succeed = true
        model.imageIds = imageIds
    }

    private fun translateSelector(selector: QuickFindSelector): Triple<List<Fingerprint>, List<Int>, List<Int>> {
        return when (selector) {
            is QuickFindSelectorOfFingerprint -> Triple(listOf(selector.fingerprint), selector.authors, selector.topics)
            is QuickFindSelectorOfIllusts -> {
                val fingerprints = data.db.from(Illusts)
                    .innerJoin(FileFingerprints, FileFingerprints.fileId eq Illusts.fileId)
                    .select(FileFingerprints.dHash, FileFingerprints.pHash, FileFingerprints.pHashSimple, FileFingerprints.dHashSimple)
                    .where { Illusts.id inList selector.illustIds }
                    .map { Fingerprint(it[FileFingerprints.pHashSimple]!!, it[FileFingerprints.dHashSimple]!!, it[FileFingerprints.pHash]!!, it[FileFingerprints.dHash]!!) }
                val authors = data.db.from(IllustAuthorRelations)
                    .select(IllustAuthorRelations.authorId)
                    .where { IllustAuthorRelations.illustId inList selector.illustIds }
                    .groupBy(IllustAuthorRelations.authorId)
                    .map { it[IllustAuthorRelations.authorId]!! }
                val topics = data.db.from(IllustTopicRelations)
                    .select(IllustTopicRelations.topicId)
                    .where { IllustTopicRelations.illustId inList selector.illustIds }
                    .groupBy(IllustTopicRelations.topicId)
                    .map { it[IllustTopicRelations.topicId]!! }
                Triple(fingerprints, authors, topics)
            }
        }
    }

    private fun taskSequence(authors: List<Int>, topics: List<Int>): Sequence<Pair<Int, Fingerprint>> {
        return sequence {
            if(authors.isNotEmpty()) yieldAll(data.db.from(Illusts)
                .innerJoin(FileFingerprints, FileFingerprints.fileId eq Illusts.fileId)
                .innerJoin(IllustAuthorRelations, IllustAuthorRelations.illustId eq Illusts.id)
                .select(Illusts.id, FileFingerprints.dHash, FileFingerprints.pHash, FileFingerprints.pHashSimple, FileFingerprints.dHashSimple)
                .where { ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (IllustAuthorRelations.authorId inList authors) }
                .map { Pair(it[Illusts.id]!!, Fingerprint(it[FileFingerprints.pHashSimple]!!, it[FileFingerprints.dHashSimple]!!, it[FileFingerprints.pHash]!!, it[FileFingerprints.dHash]!!)) })

            if(topics.isNotEmpty()) yieldAll(data.db.from(Illusts)
                .innerJoin(FileFingerprints, FileFingerprints.fileId eq Illusts.fileId)
                .innerJoin(IllustTopicRelations, IllustTopicRelations.illustId eq Illusts.id)
                .select(Illusts.id, FileFingerprints.dHash, FileFingerprints.pHash, FileFingerprints.pHashSimple, FileFingerprints.dHashSimple)
                .where { ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (IllustTopicRelations.topicId inList topics) }
                .map { Pair(it[Illusts.id]!!, Fingerprint(it[FileFingerprints.pHashSimple]!!, it[FileFingerprints.dHashSimple]!!, it[FileFingerprints.pHash]!!, it[FileFingerprints.dHash]!!)) })
        }
    }
}