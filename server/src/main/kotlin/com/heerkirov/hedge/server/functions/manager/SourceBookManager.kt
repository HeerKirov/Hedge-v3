package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.SourceBooks
import com.heerkirov.hedge.server.dto.form.SourceBookForm
import com.heerkirov.hedge.server.events.SourceBookUpdated
import com.heerkirov.hedge.server.utils.toAlphabetLowercase
import org.ktorm.dsl.*
import org.ktorm.entity.*

class SourceBookManager(private val data: DataRepository, private val bus: EventBus) {
    /**
     * 在image的source update方法中，根据给出的books dto，创建或修改数据库里的source book model，并返回这些model的id。
     * 这个方法的逻辑是，source books总是基于其key做唯一定位，当key不变时，修改其他属性视为更新，而改变key即认为是不同的对象。
     * 不会检验source的合法性，因为假设之前已经手动校验过了。
     */
    fun getAndUpsertSourceBooks(sourceSite: String, books: List<SourceBookForm>): List<Int> {
        val bookMap = books.associateBy { it.code.toAlphabetLowercase() }

        val dbBooks = data.db.sequenceOf(SourceBooks).filter { it.site eq sourceSite and (it.code inList bookMap.keys) }.toList()
        val dbBooksMap = dbBooks.associateBy { it.code.toAlphabetLowercase() }

        val minus = bookMap.keys - dbBooksMap.keys
        if(minus.isNotEmpty()) {
            data.db.batchInsert(SourceBooks) {
                for (code in minus) {
                    val book = bookMap[code]!!
                    item {
                        set(it.site, sourceSite)
                        set(it.code, code)
                        set(it.title, book.title.unwrapOr { code })
                        set(it.otherTitle, book.otherTitle.unwrapOrNull())
                    }
                }
            }
        }

        val common = bookMap.keys.intersect(dbBooksMap.keys).filter { key ->
            val form = bookMap[key]!!
            val dbBook = dbBooksMap[key]!!
            form.title.letOpt { it != dbBook.title }.unwrapOr { false } || form.otherTitle.letOpt { it != dbBook.otherTitle }.unwrapOr { false }
        }
        if(common.isNotEmpty()) {
            for (key in common) {
                val book = bookMap[key]!!
                val dbBook = dbBooksMap[key]!!
                data.db.update(SourceBooks) {
                    where { it.id eq dbBook.id }
                    book.title.applyOpt { set(it.title, this) }
                    book.otherTitle.applyOpt { set(it.otherTitle, this) }
                }
            }
        }

        minus.forEach { bus.emit(SourceBookUpdated(sourceSite, it)) }
        common.forEach { bus.emit(SourceBookUpdated(sourceSite, it)) }

        return data.db.from(SourceBooks).select(SourceBooks.id)
            .where { SourceBooks.site eq sourceSite and (SourceBooks.code inList bookMap.keys) }
            .map { it[SourceBooks.id]!! }
    }
}