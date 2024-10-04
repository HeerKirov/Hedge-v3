package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.appdata.*
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.*
import com.heerkirov.hedge.server.constants.Ui
import com.heerkirov.hedge.server.dto.form.*
import com.heerkirov.hedge.server.dto.res.SourceSiteRes
import com.heerkirov.hedge.server.events.*
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.manager.SourceSiteManager
import java.util.regex.Pattern

class SettingService(private val appdata: AppDataManager, private val bus: EventBus, private val sourceSiteManager: SourceSiteManager) {
    fun getServer(): ServerOption {
        return appdata.setting.server
    }

    fun updateServer(form: ServerOptionUpdateForm) {
        appdata.saveSetting {
            form.port.alsoOpt { server.port = it }
            form.token.alsoOpt { server.token = it }
            form.timeOffsetHour.alsoOpt { server.timeOffsetHour = it }
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
                for (rule in rules) {
                    val site = sourceSiteManager.get(rule.site) ?: throw be(ResourceNotExist("site", rule.site))
                    checkImportRule(rule, site)
                }
            }

            form.autoAnalyseSourceData.alsoOpt { import.autoAnalyseSourceData = it }
            form.preventNoneSourceData.alsoOpt { import.preventNoneSourceData = it }
            form.autoReflectMetaTag.alsoOpt { import.autoReflectMetaTag = it }
            form.resolveConflictByParent.alsoOpt { import.resolveConflictByParent = it }
            form.reflectMetaTagType.alsoOpt { import.reflectMetaTagType = it }
            form.notReflectForMixedSet.alsoOpt { import.notReflectForMixedSet = it }
            form.autoConvertFormat.alsoOpt { import.autoConvertFormat = it }
            form.autoConvertPNGThresholdSizeMB.alsoOpt { import.autoConvertPNGThresholdSizeMB = it }
            form.setTagmeOfTag.alsoOpt { import.setTagmeOfTag = it }
            form.setOrderTimeBy.alsoOpt { import.setOrderTimeBy = it }
            form.sourceAnalyseRules.alsoOpt { import.sourceAnalyseRules = it }
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
            form.onlyCleanTagmeByCharacter.alsoOpt { meta.onlyCleanTagmeByCharacter = it }
            form.centralizeCollection.alsoOpt { meta.centralizeCollection = it }
            form.bindingPartitionWithOrderTime.alsoOpt { meta.bindingPartitionWithOrderTime = it }
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

    fun listSourceSite() = sourceSiteManager.list()

    fun listBuiltinSourceSite() = sourceSiteManager.builtins()

    /**
     * @throws AlreadyExists ("site", "name", string) 此site name已经存在
     */
    fun createSourceSite(form: SiteCreateForm) = sourceSiteManager.add(form)

    /**
     * @throws NotFound 请求对象不存在
     */
    fun getSourceSite(name: String): SourceSiteRes = sourceSiteManager.get(name) ?: throw be(NotFound())

    /**
     * @throws BuiltinNotWritableError (string) 内建项不可写
     */
    fun updateSourceSite(name: String, form: SiteUpdateForm) = sourceSiteManager.update(name, form)

    /**
     * @throws CascadeResourceExists ("Illust" | "ImportImage" | "TrashedImage | "SourceAnalyseRule" | "SpiderRule", "site", string) 存在某种资源仍依赖此site，无法删除
     */
    fun deleteSourceSite(name: String) = sourceSiteManager.remove(name)

    /**
     * @throws AlreadyExists ("site", "name", string) 此site name重名
     * @throws CascadeResourceExists ("Illust" | "ImportImage" | "TrashedImage | "SourceAnalyseRule" | "SpiderRule", "site", string[]) 存在某种资源仍依赖此site，无法删除
     * @throws BuiltinNotWritableError (string) 内建项不可写
     * @throws Reject 部分参数错误给出
     */
    fun updateAllSourceSite(sites: List<SiteBulkForm>) = sourceSiteManager.bulk(sites)

    /**
     * @throws InvalidRuleIndexError (string, string) rule的index与regex不匹配
     */
    private fun checkImportRule(rule: ImportOption.SourceAnalyseRule, site: SourceSiteRes) {
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
                    else if(site.additionalInfo.none { it.field == extra.additionalInfoField }) throw be(ParamError("additionalInfoField"))
                }
                if(extra.target != ImportOption.SourceAnalyseRuleExtraTarget.ADDITIONAL_INFO && !extra.additionalInfoField.isNullOrEmpty()) throw be(InvalidRuleIndexError(site.name, rule.regex, "additionalInfoField"))
                if(extra.target != ImportOption.SourceAnalyseRuleExtraTarget.TAG && !extra.tagType.isNullOrEmpty()) throw be(InvalidRuleIndexError(site.name, rule.regex, "tagType"))
            }
        }
    }
}