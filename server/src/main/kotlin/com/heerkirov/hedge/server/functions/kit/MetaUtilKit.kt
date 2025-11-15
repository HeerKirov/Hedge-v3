package com.heerkirov.hedge.server.functions.kit

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dao.Authors
import com.heerkirov.hedge.server.dao.Tags
import com.heerkirov.hedge.server.dao.Topics
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.TagAddressType
import com.heerkirov.hedge.server.utils.business.filePathFrom
import org.ktorm.dsl.*

class MetaUtilKit(private val appdata: AppDataManager, private val data: DataRepository) {
    /**
     * 获得一个collection的元数据。
     */
    fun suggestMetaOfCollection(collectionId: Int): MetaUtilSuggestionByParentCollection {
        val res = getMetaOfIllust(collectionId)
        return MetaUtilSuggestionByParentCollection(collectionId, res.topics, res.authors, res.tags)
    }

    /**
     * 获得一个collection的所有下属image的元数据。
     */
    fun suggestMetaOfCollectionChildren(collectionId: Int): MetaUtilSuggestionByChildren {
        val authorColors = appdata.setting.meta.authorColors
        val topicColors = appdata.setting.meta.topicColors

        val topics = data.db.from(Topics)
            .innerJoin(IllustTopicRelations, IllustTopicRelations.topicId eq Topics.id)
            .innerJoin(Illusts, Illusts.id eq IllustTopicRelations.illustId)
            .select(Topics.id, Topics.name, Topics.type, Topics.parentId, IllustTopicRelations.isExported)
            .where { Illusts.parentId eq collectionId }
            .groupBy(Topics.id)
            .orderBy(Topics.type.asc(), Topics.id.asc())
            .toTopicSimpleList(topicColors, isExportedColumn = IllustTopicRelations.isExported)

        val authors = data.db.from(Authors)
            .innerJoin(IllustAuthorRelations, IllustAuthorRelations.authorId eq Authors.id)
            .innerJoin(Illusts, Illusts.id eq IllustAuthorRelations.illustId)
            .select(Authors.id, Authors.name, Authors.type, IllustAuthorRelations.isExported)
            .where { Illusts.parentId eq collectionId }
            .groupBy(Authors.id)
            .orderBy(Authors.type.desc(), Authors.id.asc())
            .toAuthorSimpleList(authorColors, isExportedColumn = IllustAuthorRelations.isExported)

        val tags = data.db.from(Tags)
            .innerJoin(IllustTagRelations, IllustTagRelations.tagId eq Tags.id)
            .innerJoin(Illusts, Illusts.id eq IllustTagRelations.illustId)
            .select(Tags.id, Tags.name, Tags.color, Tags.parentId, Tags.isOverrideGroup, IllustTagRelations.isExported)
            .where { (Illusts.parentId eq collectionId) and (Tags.type eq TagAddressType.TAG) }
            .groupBy(Tags.id)
            .orderBy(Tags.globalOrdinal.asc())
            .toTagSimpleList(isExportedColumn = IllustTagRelations.isExported)

        return MetaUtilSuggestionByChildren(topics, authors, tags)
    }

    /**
     * 获得一个book的下属所有image的元数据。
     */
    fun suggestMetaOfBookChildren(bookId: Int): MetaUtilSuggestionByChildren {
        val authorColors = appdata.setting.meta.authorColors
        val topicColors = appdata.setting.meta.topicColors

        val topics = data.db.from(Topics)
            .innerJoin(IllustTopicRelations, IllustTopicRelations.topicId eq Topics.id)
            .innerJoin(BookImageRelations, BookImageRelations.imageId eq IllustTopicRelations.illustId)
            .select(Topics.id, Topics.name, Topics.type, Topics.parentId, IllustTopicRelations.isExported)
            .where { BookImageRelations.bookId eq bookId }
            .groupBy(Topics.id)
            .orderBy(Topics.type.asc(), Topics.id.asc())
            .toTopicSimpleList(topicColors, isExportedColumn = IllustTopicRelations.isExported)

        val authors = data.db.from(Authors)
            .innerJoin(IllustAuthorRelations, IllustAuthorRelations.authorId eq Authors.id)
            .innerJoin(BookImageRelations, BookImageRelations.imageId eq IllustAuthorRelations.illustId)
            .select(Authors.id, Authors.name, Authors.type, IllustAuthorRelations.isExported)
            .where { BookImageRelations.bookId eq bookId }
            .groupBy(Authors.id)
            .orderBy(Authors.type.desc(), Authors.id.asc())
            .toAuthorSimpleList(authorColors, isExportedColumn = IllustAuthorRelations.isExported)

        val tags = data.db.from(Tags)
            .innerJoin(IllustTagRelations, IllustTagRelations.tagId eq Tags.id)
            .innerJoin(BookImageRelations, BookImageRelations.imageId eq IllustTagRelations.illustId)
            .select(Tags.id, Tags.name, Tags.color, Tags.parentId, Tags.isOverrideGroup, IllustTagRelations.isExported)
            .where { (BookImageRelations.bookId eq bookId) and (Tags.type eq TagAddressType.TAG) }
            .groupBy(Tags.id)
            .orderBy(Tags.globalOrdinal.asc())
            .toTagSimpleList(isExportedColumn = IllustTagRelations.isExported)

        return MetaUtilSuggestionByChildren(topics, authors, tags)
    }

    /**
     * 获得一个associate下所有illust的元数据。
     */
    fun suggestMetaOfAllAssociate(illustId: Int): MetaUtilSuggestionByAssociate {
        val authorColors = appdata.setting.meta.authorColors
        val topicColors = appdata.setting.meta.topicColors

        val topics = data.db.from(Topics)
            .innerJoin(IllustTopicRelations, IllustTopicRelations.topicId eq Topics.id)
            .innerJoin(AssociateRelations, AssociateRelations.relatedIllustId eq IllustTopicRelations.illustId)
            .select(Topics.id, Topics.name, Topics.type, Topics.parentId, IllustTopicRelations.isExported)
            .where { AssociateRelations.illustId eq illustId }
            .groupBy(Topics.id)
            .orderBy(Topics.type.asc(), Topics.id.asc())
            .toTopicSimpleList(topicColors, isExportedColumn = IllustTopicRelations.isExported)

        val authors = data.db.from(Authors)
            .innerJoin(IllustAuthorRelations, IllustAuthorRelations.authorId eq Authors.id)
            .innerJoin(AssociateRelations, AssociateRelations.relatedIllustId eq IllustAuthorRelations.illustId)
            .select(Authors.id, Authors.name, Authors.type, IllustAuthorRelations.isExported)
            .where { AssociateRelations.illustId eq illustId }
            .groupBy(Authors.id)
            .orderBy(Authors.type.desc(), Authors.id.asc())
            .toAuthorSimpleList(authorColors, isExportedColumn = IllustAuthorRelations.isExported)

        val tags = data.db.from(Tags)
            .innerJoin(IllustTagRelations, IllustTagRelations.tagId eq Tags.id)
            .innerJoin(AssociateRelations, AssociateRelations.relatedIllustId eq IllustTagRelations.illustId)
            .select(Tags.id, Tags.name, Tags.color, Tags.parentId, Tags.isOverrideGroup, IllustTagRelations.isExported)
            .where { (AssociateRelations.illustId eq illustId) and (Tags.type eq TagAddressType.TAG) }
            .groupBy(Tags.id)
            .orderBy(Tags.globalOrdinal.asc())
            .toTagSimpleList(isExportedColumn = IllustTagRelations.isExported)

        return MetaUtilSuggestionByAssociate(topics, authors, tags)
    }

    /**
     * 获得关联的所有book的元数据。
     */
    fun suggestMetaOfBook(imageId: Int): List<MetaUtilSuggestionByBook> {
        val books = data.db.from(Books)
            .innerJoin(BookImageRelations, BookImageRelations.bookId eq Books.id)
            .leftJoin(FileRecords, Books.fileId eq FileRecords.id)
            .select(Books.id, Books.title, FileRecords.id, FileRecords.status, FileRecords.block, FileRecords.extension)
            .where { BookImageRelations.imageId eq imageId }
            .map { BookSimpleRes(it[Books.id]!!, it[Books.title]!!, if(it[FileRecords.id] != null) filePathFrom(it) else null) }

        return books.map { book ->
            val res = getMetaOfBook(book.id)
            MetaUtilSuggestionByBook(book, res.topics, res.authors, res.tags)
        }
    }

    /**
     * 获得指定illust的元数据。
     */
    fun getMetaOfIllust(illustId: Int): MetaUtilRes {
        val authorColors = appdata.setting.meta.authorColors
        val topicColors = appdata.setting.meta.topicColors

        val topics = data.db.from(Topics)
            .innerJoin(IllustTopicRelations, IllustTopicRelations.topicId eq Topics.id)
            .select(Topics.id, Topics.name, Topics.type, Topics.parentId, IllustTopicRelations.isExported)
            .where { IllustTopicRelations.illustId eq illustId }
            .orderBy(Topics.type.asc(), Topics.id.asc())
            .toTopicSimpleList(topicColors, isExportedColumn = IllustTopicRelations.isExported)

        val authors = data.db.from(Authors)
            .innerJoin(IllustAuthorRelations, IllustAuthorRelations.authorId eq Authors.id)
            .select(Authors.id, Authors.name, Authors.type, IllustAuthorRelations.isExported)
            .where { IllustAuthorRelations.illustId eq illustId }
            .orderBy(Authors.type.desc(), Authors.id.asc())
            .toAuthorSimpleList(authorColors, isExportedColumn = IllustAuthorRelations.isExported)

        val tags = data.db.from(Tags)
            .innerJoin(IllustTagRelations, IllustTagRelations.tagId eq Tags.id)
            .select(Tags.id, Tags.name, Tags.color, Tags.parentId, Tags.isOverrideGroup, IllustTagRelations.isExported)
            .where { (IllustTagRelations.illustId eq illustId) and (Tags.type eq TagAddressType.TAG) }
            .orderBy(Tags.globalOrdinal.asc())
            .toTagSimpleList(isExportedColumn = IllustTagRelations.isExported)

        return MetaUtilRes(topics, authors, tags)
    }

    /**
     * 获得指定book的元数据。
     */
    fun getMetaOfBook(bookId: Int): MetaUtilRes {
        val authorColors = appdata.setting.meta.authorColors
        val topicColors = appdata.setting.meta.topicColors

        val topics = data.db.from(Topics)
            .innerJoin(BookTopicRelations, BookTopicRelations.topicId eq Topics.id)
            .select(Topics.id, Topics.name, Topics.type, Topics.parentId, BookTopicRelations.isExported)
            .where { BookTopicRelations.bookId eq bookId }
            .orderBy(Topics.type.asc(), Topics.id.asc())
            .toTopicSimpleList(topicColors, isExportedColumn = BookTopicRelations.isExported)

        val authors = data.db.from(Authors)
            .innerJoin(BookAuthorRelations, BookAuthorRelations.authorId eq Authors.id)
            .select(Authors.id, Authors.name, Authors.type, BookAuthorRelations.isExported)
            .where { BookAuthorRelations.bookId eq bookId }
            .orderBy(Authors.type.desc(), Authors.id.asc())
            .toAuthorSimpleList(authorColors, isExportedColumn = BookAuthorRelations.isExported)

        val tags = data.db.from(Tags)
            .innerJoin(BookTagRelations, BookTagRelations.tagId eq Tags.id)
            .select(Tags.id, Tags.name, Tags.color, Tags.parentId, Tags.isOverrideGroup, BookTagRelations.isExported)
            .where { (BookTagRelations.bookId eq bookId) and (Tags.type eq TagAddressType.TAG) }
            .orderBy(Tags.globalOrdinal.asc())
            .toTagSimpleList(isExportedColumn = BookTagRelations.isExported)

        return MetaUtilRes(topics, authors, tags)
    }
}