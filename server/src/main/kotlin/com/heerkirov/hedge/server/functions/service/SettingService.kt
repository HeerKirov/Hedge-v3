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
import org.ktorm.dsl.eq
import org.ktorm.entity.any
import org.ktorm.entity.sequenceOf

class SettingService(private val appdata: AppDataManager, private val data: DataRepository, private val bus: EventBus) {
    fun getAppdataService(): ServiceOption {
        return appdata.appdata.service
    }

    fun updateAppdataService(form: ServiceOptionUpdateForm) {
        appdata.save {
            form.port.alsoOpt { service.port = it }
            form.storagePath.alsoOpt { service.storagePath = it }
        }

        bus.emit(SettingServiceChanged())
    }

    fun getFindSimilar(): FindSimilarOption {
        return data.setting.findSimilar
    }

    fun updateFindSimilar(form: FindSimilarOptionUpdateForm) {
        data.syncSetting {
            data.saveSetting {
                form.autoFindSimilar.alsoOpt { findSimilar.autoFindSimilar = it }
                form.autoTaskConf.alsoOpt { findSimilar.autoTaskConf = it }
                form.defaultTaskConf.alsoOpt { findSimilar.defaultTaskConf = it }
            }
        }

        bus.emit(SettingFindSimilarChanged())
    }

    fun getImport(): ImportOption {
        return data.setting.import
    }

    /**
     * @throws ResourceNotExist ("site", string) rules中有给出的site不存在
     * @throws InvalidRuleIndexError (string, string) rules的index与regex不匹配
     */
    fun updateImport(form: ImportOptionUpdateForm) {
        data.syncSetting {
            form.sourceAnalyseRules.alsoOpt { rules ->
                val sites = setting.source.sites.associateBy { it.name }

                for (rule in rules) {
                    val site = sites[rule.site] ?: throw be(ResourceNotExist("site", rule.site))
                    checkImportRule(rule, site)
                }
            }

            saveSetting {
                form.autoAnalyseSourceData.alsoOpt { import.autoAnalyseSourceData = it }
                form.setTagmeOfTag.alsoOpt { import.setTagmeOfTag = it }
                form.setTagmeOfSource.alsoOpt { import.setTagmeOfSource = it }
                form.setOrderTimeBy.alsoOpt { import.setOrderTimeBy = it }
                form.setPartitionTimeDelay.alsoOpt { import.setPartitionTimeDelay = it }
                form.sourceAnalyseRules.alsoOpt { import.sourceAnalyseRules = it }
                form.watchPaths.alsoOpt { import.watchPaths = it }
                form.autoWatchPath.alsoOpt { import.autoWatchPath = it }
                form.watchPathMoveFile.alsoOpt { import.watchPathMoveFile = it }
                form.watchPathInitialize.alsoOpt { import.watchPathInitialize = it }
            }
        }

        bus.emit(SettingImportChanged())
    }

    fun getFile(): FileOption {
        return data.setting.file
    }

    fun updateFile(form: FileOptionUpdateForm) {
        data.syncSetting {
            saveSetting {
                form.autoCleanTrashes.alsoOpt { file.autoCleanTrashes = it }
                form.autoCleanTrashesIntervalDay.alsoOpt { file.autoCleanTrashesIntervalDay = it }
            }
        }

        bus.emit(SettingFileChanged())
    }

    fun getMeta(): MetaOption {
        return data.setting.meta
    }

    fun updateMeta(form: MetaOptionUpdateForm) {
        form.authorColors.alsoOpt { m -> m.values.find { !Ui.USEFUL_COLORS.contains(it) }?.let { throw be(
            InvalidColorError(it)
        ) } }
        form.topicColors.alsoOpt { m -> m.values.find { !Ui.USEFUL_COLORS.contains(it) }?.let { throw be(
            InvalidColorError(it)
        ) } }

        data.syncSetting {
            saveSetting {
                form.autoCleanTagme.alsoOpt { meta.autoCleanTagme = it }
                form.scoreDescriptions.alsoOpt { meta.scoreDescriptions = it }
                form.topicColors.alsoOpt { meta.topicColors = it }
                form.authorColors.alsoOpt { meta.authorColors = it }
            }
        }

        bus.emit(SettingMetaChanged())
    }

    fun getQuery(): QueryOption {
        return data.setting.query
    }

    fun updateQuery(form: QueryOptionUpdateForm) {
        data.syncSetting {
            saveSetting {
                form.chineseSymbolReflect.alsoOpt { query.chineseSymbolReflect = it }
                form.translateUnderscoreToSpace.alsoOpt { query.translateUnderscoreToSpace = it }
                form.queryLimitOfQueryItems.alsoOpt { query.queryLimitOfQueryItems = it }
                form.warningLimitOfUnionItems.alsoOpt { query.warningLimitOfUnionItems = it }
                form.warningLimitOfIntersectItems.alsoOpt { query.warningLimitOfIntersectItems = it }
            }
        }

        bus.emit(SettingQueryChanged())
    }

    fun listSourceSite(): List<SourceOption.Site> {
        return data.setting.source.sites
    }

    /**
     * @throws AlreadyExists ("site", "name", string) 此site name已经存在
     */
    fun createSourceSite(form: SiteCreateForm) {
        data.syncSetting {
            val sites = setting.source.sites
            if(sites.any { it.name == form.name }) throw be(AlreadyExists("site", "name", form.name))

            val newSite = SourceOption.Site(form.name, form.title, form.hasSecondaryId, form.availableAdditionalInfo, form.sourceLinkGenerateRules)

            val ordinal = form.ordinal?.let {
                when {
                    it < 0 -> 0
                    it >= sites.size -> null
                    else -> it
                }
            }

            saveSetting {
                if(ordinal != null) {
                    sites.add(ordinal, newSite)
                }else{
                    sites.add(newSite)
                }
            }
        }

        bus.emit(SettingSourceSiteChanged())
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun getSourceSite(name: String): SourceOption.Site {
        return data.setting.source.sites.firstOrNull { it.name == name } ?: throw be(NotFound())
    }

    fun updateSourceSite(name: String, form: SiteUpdateForm) {
        data.syncSetting {
            val site = getSourceSite(name)

            saveSetting {
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
                    val sites = data.setting.source.sites
                    val newOrdinal = when {
                        it < 0 -> 0
                        it > sites.size -> sites.size
                        else -> it
                    }
                    val oldOrdinal = sites.indexOf(site)

                    if(oldOrdinal < newOrdinal) {
                        data.setting.source.sites.apply {
                            clear()
                            addAll(sites.subList(0, oldOrdinal) + sites.subList(oldOrdinal + 1, newOrdinal) + site + sites.subList(newOrdinal, sites.size))
                        }
                    }else if(oldOrdinal > newOrdinal) {
                        data.setting.source.sites.apply {
                            clear()
                            addAll(sites.subList(0, newOrdinal) + site + sites.subList(newOrdinal, oldOrdinal) + site + sites.subList(oldOrdinal + 1, sites.size))
                        }
                    }
                }
            }
        }

        bus.emit(SettingSourceSiteChanged())
    }

    /**
     * @throws CascadeResourceExists ("Illust" | "ImportImage" | "TrashedImage | "SourceAnalyseRule" | "SpiderRule") 存在某种资源仍依赖此site，无法删除
     */
    fun deleteSourceSite(name: String) {
        data.db.transaction {
            val site = getSourceSite(name)

            if(data.db.sequenceOf(Illusts).any { it.sourceSite eq name }) {
                throw be(CascadeResourceExists("Illust"))
            }
            if(data.db.sequenceOf(ImportImages).any { it.sourceSite eq name }) {
                throw be(CascadeResourceExists("ImportImage"))
            }
            if(data.db.sequenceOf(TrashedImages).any { it.sourceSite eq name }) {
                throw be(CascadeResourceExists("TrashedImage"))
            }
            if(data.setting.import.sourceAnalyseRules.any { it.site == name }) {
                throw be(CascadeResourceExists("SourceAnalyseRule"))
            }

            data.syncSetting {
                saveSetting {
                    source.sites.remove(site)
                }
            }
        }

        bus.emit(SettingSourceSiteChanged())
    }

    /**
     * @throws InvalidRuleIndexError (string, string) rule的index与regex不匹配
     */
    private fun checkImportRule(rule: ImportOption.SourceAnalyseRule, site: SourceOption.Site) {
        if((rule.secondaryIdGroup != null) xor site.hasSecondaryId) throw be(InvalidRuleIndexError(site.name, rule.regex))
        if(rule.idGroup.isBlank()) throw be(ParamRequired("idGroup"))
        if(site.hasSecondaryId && rule.secondaryIdGroup.isNullOrBlank()) throw be(ParamRequired("secondaryIdGroup"))
        if(!rule.extras.isNullOrEmpty()) {
            for(extra in rule.extras) {
                if(extra.group.isBlank()) throw be(ParamRequired("group"))
                if(extra.target == ImportOption.SourceAnalyseRuleExtraTarget.ADDITIONAL_INFO) {
                    if(extra.additionalInfoField.isNullOrEmpty()) throw be(ParamRequired("additionalInfoField"))
                    else if(site.availableAdditionalInfo.none { it.field == extra.additionalInfoField }) throw be(ParamError("additionalInfoField"))
                }
                if(extra.target != ImportOption.SourceAnalyseRuleExtraTarget.ADDITIONAL_INFO && !extra.additionalInfoField.isNullOrEmpty()) throw be(ParamNotRequired("additionalInfoField"))
                if(extra.target != ImportOption.SourceAnalyseRuleExtraTarget.TAG && !extra.tagType.isNullOrEmpty()) throw be(ParamNotRequired("tagType"))
            }
        }
    }
}