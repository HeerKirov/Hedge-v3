package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.appdata.*
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.*
import com.heerkirov.hedge.server.constants.Ui
import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.dao.ImportImages
import com.heerkirov.hedge.server.dao.TrashedImages
import com.heerkirov.hedge.server.dto.form.*
import com.heerkirov.hedge.server.events.*
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.utils.business.checkVariableName
import com.heerkirov.hedge.server.utils.filterInto
import org.ktorm.dsl.eq
import org.ktorm.dsl.inList
import org.ktorm.entity.any
import org.ktorm.entity.sequenceOf
import java.util.regex.Pattern

class SettingService(private val appdata: AppDataManager, private val data: DataRepository, private val bus: EventBus) {
    fun getServer(): ServerOption {
        return appdata.setting.server
    }

    fun updateServer(form: ServerOptionUpdateForm) {
        appdata.saveSetting {
            form.port.alsoOpt { server.port = it }
        }

        bus.emit(SettingServerChanged())
    }

    fun getFindSimilar(): FindSimilarOption {
        return appdata.setting.findSimilar
    }

    fun updateFindSimilar(form: FindSimilarOptionUpdateForm) {
        appdata.saveSetting {
            form.autoFindSimilar.alsoOpt { findSimilar.autoFindSimilar = it }
            form.autoTaskConf.alsoOpt { findSimilar.autoTaskConf = it }
            form.defaultTaskConf.alsoOpt { findSimilar.defaultTaskConf = it }
        }

        bus.emit(SettingFindSimilarChanged())
    }

    fun getImport(): ImportOption {
        return appdata.setting.import
    }

    /**
     * @throws ResourceNotExist ("site", string) rules中有给出的site不存在
     * @throws InvalidRuleIndexError (string, string) rules的index与regex不匹配
     */
    fun updateImport(form: ImportOptionUpdateForm) {
        appdata.saveSetting {
            form.sourceAnalyseRules.alsoOpt { rules ->
                val sites = source.sites.associateBy { it.name }

                for (rule in rules) {
                    val site = sites[rule.site] ?: throw be(ResourceNotExist("site", rule.site))
                    checkImportRule(rule, site)
                }
            }

            form.autoAnalyseSourceData.alsoOpt { import.autoAnalyseSourceData = it }
            form.setTagmeOfTag.alsoOpt { import.setTagmeOfTag = it }
            form.setTagmeOfSource.alsoOpt { import.setTagmeOfSource = it }
            form.setOrderTimeBy.alsoOpt { import.setOrderTimeBy = it }
            form.setPartitionTimeDelay.alsoOpt { import.setPartitionTimeDelayHour = it }
            form.sourceAnalyseRules.alsoOpt { import.sourceAnalyseRules = it }
            form.watchPaths.alsoOpt { import.watchPaths = it }
            form.autoWatchPath.alsoOpt { import.autoWatchPath = it }
            form.watchPathMoveFile.alsoOpt { import.watchPathMoveFile = it }
            form.watchPathInitialize.alsoOpt { import.watchPathInitialize = it }
        }

        bus.emit(SettingImportChanged())
    }

    fun getStorage(): StorageOption {
        return appdata.setting.storage
    }

    fun updateStorage(form: StorageOptionUpdateForm) {
        appdata.saveSetting {
            form.storagePath.alsoOpt { storage.storagePath = it }
            form.autoCleanTrashes.alsoOpt { storage.autoCleanTrashes = it }
            form.autoCleanTrashesIntervalDay.alsoOpt { storage.autoCleanTrashesIntervalDay = it }
            form.autoCleanCaches.alsoOpt { storage.autoCleanCaches = it }
            form.autoCleanCachesIntervalDay.alsoOpt { storage.autoCleanCachesIntervalDay = it }
            form.blockMaxSizeMB.alsoOpt { storage.blockMaxSizeMB = it }
            form.blockMaxCount.alsoOpt { storage.blockMaxCount = it }
        }

        bus.emit(SettingArchiveChanged())
    }

    fun getMeta(): MetaOption {
        return appdata.setting.meta
    }

    fun updateMeta(form: MetaOptionUpdateForm) {
        form.authorColors.alsoOpt { m -> m.values.find { !Ui.USEFUL_COLORS.contains(it) }?.let { throw be(
            InvalidColorError(it)
        ) } }
        form.topicColors.alsoOpt { m -> m.values.find { !Ui.USEFUL_COLORS.contains(it) }?.let { throw be(
            InvalidColorError(it)
        ) } }

        appdata.saveSetting {
            form.autoCleanTagme.alsoOpt { meta.autoCleanTagme = it }
            form.topicColors.alsoOpt { meta.topicColors = it }
            form.authorColors.alsoOpt { meta.authorColors = it }
        }

        bus.emit(SettingMetaChanged())
    }

    fun getQuery(): QueryOption {
        return appdata.setting.query
    }

    fun updateQuery(form: QueryOptionUpdateForm) {
        appdata.saveSetting {
            form.chineseSymbolReflect.alsoOpt { query.chineseSymbolReflect = it }
            form.translateUnderscoreToSpace.alsoOpt { query.translateUnderscoreToSpace = it }
            form.queryLimitOfQueryItems.alsoOpt { query.queryLimitOfQueryItems = it }
            form.warningLimitOfUnionItems.alsoOpt { query.warningLimitOfUnionItems = it }
            form.warningLimitOfIntersectItems.alsoOpt { query.warningLimitOfIntersectItems = it }
        }

        bus.emit(SettingQueryChanged())
    }

    fun listSourceSite(): List<SourceOption.Site> {
        return appdata.setting.source.sites
    }

    /**
     * @throws AlreadyExists ("site", "name", string) 此site name已经存在
     */
    fun createSourceSite(form: SiteCreateForm) {
        appdata.saveSetting {
            val sites = source.sites
            if(sites.any { it.name == form.name }) throw be(AlreadyExists("site", "name", form.name))
            for(metadata in form.availableAdditionalInfo) {
                if(!checkVariableName(metadata.field)) {
                    throw be(ParamError("availableAdditionalInfo"))
                }
            }

            val newSite = SourceOption.Site(form.name, form.title, form.partMode, form.availableAdditionalInfo, form.sourceLinkGenerateRules)

            val ordinal = form.ordinal?.let {
                when {
                    it < 0 -> 0
                    it >= sites.size -> null
                    else -> it
                }
            }

            if(ordinal != null) {
                sites.add(ordinal, newSite)
            }else{
                sites.add(newSite)
            }
        }

        bus.emit(SettingSourceSiteChanged())
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun getSourceSite(name: String): SourceOption.Site {
        return appdata.setting.source.sites.firstOrNull { it.name == name } ?: throw be(NotFound())
    }

    fun updateSourceSite(name: String, form: SiteUpdateForm) {
        appdata.saveSetting {
            val site = getSourceSite(name)

            form.title.alsoOpt { site.title = it }
            form.sourceLinkGenerateRules.alsoOpt { site.sourceLinkGenerateRules = it }
            form.availableAdditionalInfo.alsoOpt {
                for(metadata in it) {
                    if(!checkVariableName(metadata.field)) {
                        throw be(ParamError("availableAdditionalInfo"))
                    }
                }
                site.availableAdditionalInfo = it
            }
            form.ordinal.alsoOpt {
                val sites = source.sites
                val newOrdinal = when {
                    it < 0 -> 0
                    it > sites.size -> sites.size
                    else -> it
                }
                val oldOrdinal = sites.indexOf(site)

                if(oldOrdinal < newOrdinal) {
                    source.sites.apply {
                        clear()
                        addAll(sites.subList(0, oldOrdinal) + sites.subList(oldOrdinal + 1, newOrdinal) + site + sites.subList(newOrdinal, sites.size))
                    }
                }else if(oldOrdinal > newOrdinal) {
                    source.sites.apply {
                        clear()
                        addAll(sites.subList(0, newOrdinal) + site + sites.subList(newOrdinal, oldOrdinal) + site + sites.subList(oldOrdinal + 1, sites.size))
                    }
                }
            }

        }

        bus.emit(SettingSourceSiteChanged())
    }

    /**
     * @throws CascadeResourceExists ("Illust" | "ImportImage" | "TrashedImage | "SourceAnalyseRule" | "SpiderRule", "site", string) 存在某种资源仍依赖此site，无法删除
     */
    fun deleteSourceSite(name: String) {
        data.db.transaction {
            val site = getSourceSite(name)

            if(data.db.sequenceOf(Illusts).any { it.sourceSite eq name }) {
                throw be(CascadeResourceExists("Illust", "site", name))
            }
            if(data.db.sequenceOf(ImportImages).any { it.sourceSite eq name }) {
                throw be(CascadeResourceExists("ImportImage", "site", name))
            }
            if(data.db.sequenceOf(TrashedImages).any { it.sourceSite eq name }) {
                throw be(CascadeResourceExists("TrashedImage", "site", name))
            }
            if(appdata.setting.import.sourceAnalyseRules.any { it.site == name }) {
                throw be(CascadeResourceExists("SourceAnalyseRule", "site", name))
            }

            appdata.saveSetting {
                source.sites.remove(site)
            }
        }

        bus.emit(SettingSourceSiteChanged())
    }

    /**
     * @throws AlreadyExists ("site", "name", string) 此site name重名
     * @throws CascadeResourceExists ("Illust" | "ImportImage" | "TrashedImage | "SourceAnalyseRule" | "SpiderRule", "site", string[]) 存在某种资源仍依赖此site，无法删除
     * @throws Reject 部分参数错误给出
     */
    fun updateAllSourceSite(sites: List<SiteBulkForm>) {
        appdata.saveSetting {
            sites.groupBy { it.name }.mapValues { (_, v) -> v.count() }.filterValues { it > 1 }.keys.firstOrNull()?.let { throw be(AlreadyExists("site", "name", it)) }
            if(sites.mapNotNull { it.availableAdditionalInfo.unwrapOrNull() }.flatten().any { !checkVariableName(it.field) }) { throw be(ParamError("availableAdditionalInfo")) }
            val exists = source.sites.associateBy { it.name }

            val (updates, adds) = sites.filterInto { it.name in exists.keys }
            for(update in updates) {
                val cur = exists[update.name]!!
                if(update.partMode.isPresent && update.partMode.value != cur.partMode) throw be(Reject("Param 'partMode' cannot be modified for existed site '${update.name}'."))
            }
            for(add in adds) {
                if(add.title.isUndefined) throw be(Reject("Param 'title' must be provided for not existed site '${add.name}'."))
            }

            val deletes = source.sites.filter { it.name !in sites.map(SiteBulkForm::name) }.map { it.name }
            if(data.db.sequenceOf(Illusts).any { it.sourceSite inList deletes }) {
                throw be(CascadeResourceExists("Illust", "site", deletes))
            }
            if(data.db.sequenceOf(ImportImages).any { it.sourceSite inList deletes }) {
                throw be(CascadeResourceExists("ImportImage", "site", deletes))
            }
            if(data.db.sequenceOf(TrashedImages).any { it.sourceSite inList deletes }) {
                throw be(CascadeResourceExists("TrashedImage", "site", deletes))
            }
            if(import.sourceAnalyseRules.any { it.site in deletes }) {
                throw be(CascadeResourceExists("SourceAnalyseRule", "site", deletes))
            }

            source.sites.clear()
            for (form in sites) {
                val cur = exists[form.name]
                if(cur != null) {
                    source.sites.add(SourceOption.Site(
                        form.name,
                        form.title.unwrapOr { cur.title },
                        cur.partMode,
                        form.availableAdditionalInfo.unwrapOr { cur.availableAdditionalInfo },
                        form.sourceLinkGenerateRules.unwrapOr { cur.sourceLinkGenerateRules }
                    ))
                }else{
                    source.sites.add(SourceOption.Site(
                        form.name,
                        form.title.value,
                        form.partMode.unwrapOr { SourceOption.SitePartMode.NO },
                        form.availableAdditionalInfo.unwrapOr { emptyList() },
                        form.sourceLinkGenerateRules.unwrapOr { emptyList() }
                    ))
                }
            }
        }

        bus.emit(SettingSourceSiteChanged())
    }

    /**
     * @throws InvalidRuleIndexError (string, string) rule的index与regex不匹配
     */
    private fun checkImportRule(rule: ImportOption.SourceAnalyseRule, site: SourceOption.Site) {
        try {
            Pattern.compile(rule.regex)
        }catch (e: Exception) {
            throw be(InvalidRuleIndexError(site.name, rule.regex, "regex"))
        }
        if(rule.idGroup.isBlank()) throw be(ParamRequired("idGroup"))
        when(site.partMode) {
            SourceOption.SitePartMode.NO -> {
                if(!rule.partGroup.isNullOrBlank()) throw be(InvalidRuleIndexError(site.name, rule.regex, "partGroup"))
                if(!rule.partNameGroup.isNullOrBlank()) throw be(InvalidRuleIndexError(site.name, rule.regex, "partNameGroup"))
            }
            SourceOption.SitePartMode.PAGE -> {
                if(rule.partGroup.isNullOrBlank()) throw be(InvalidRuleIndexError(site.name, rule.regex, "partGroup"))
                if(!rule.partNameGroup.isNullOrBlank()) throw be(InvalidRuleIndexError(site.name, rule.regex, "partNameGroup"))
            }
            SourceOption.SitePartMode.PAGE_WITH_NAME -> {
                if(rule.partGroup.isNullOrBlank()) throw be(InvalidRuleIndexError(site.name, rule.regex, "partGroup"))
            }
        }
        if(!rule.extras.isNullOrEmpty()) {
            for(extra in rule.extras) {
                if(extra.group.isBlank()) throw be(InvalidRuleIndexError(site.name, rule.regex, "group"))
                if(extra.target == ImportOption.SourceAnalyseRuleExtraTarget.ADDITIONAL_INFO) {
                    if(extra.additionalInfoField.isNullOrEmpty()) throw be(InvalidRuleIndexError(site.name, rule.regex, "additionalInfoField"))
                    else if(site.availableAdditionalInfo.none { it.field == extra.additionalInfoField }) throw be(ParamError("additionalInfoField"))
                }
                if(extra.target != ImportOption.SourceAnalyseRuleExtraTarget.ADDITIONAL_INFO && !extra.additionalInfoField.isNullOrEmpty()) throw be(InvalidRuleIndexError(site.name, rule.regex, "additionalInfoField"))
                if(extra.target != ImportOption.SourceAnalyseRuleExtraTarget.TAG && !extra.tagType.isNullOrEmpty()) throw be(InvalidRuleIndexError(site.name, rule.regex, "tagType"))
            }
        }
    }
}