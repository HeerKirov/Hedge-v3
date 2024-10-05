package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.appdata.SourceOption
import com.heerkirov.hedge.server.components.appdata.saveSetting
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.constants.BUILTIN_SITES
import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.dao.TrashedImages
import com.heerkirov.hedge.server.dto.form.SiteBulkForm
import com.heerkirov.hedge.server.dto.form.SiteCreateForm
import com.heerkirov.hedge.server.dto.form.SiteUpdateForm
import com.heerkirov.hedge.server.dto.res.SourceSiteRes
import com.heerkirov.hedge.server.events.SettingSourceSiteChanged
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.utils.business.checkVariableName
import com.heerkirov.hedge.server.utils.filterInto
import org.ktorm.dsl.eq
import org.ktorm.dsl.inList
import org.ktorm.entity.any
import org.ktorm.entity.sequenceOf

class SourceSiteManager(private val appdata: AppDataManager, private val data: DataRepository, private val bus: EventBus) {
    private val builtinMap = BUILTIN_SITES.associateBy { it.name }

    fun builtins(): List<SourceSiteRes> {
        return BUILTIN_SITES
    }

    fun list(): List<SourceSiteRes> {
        return appdata.setting.source.sites.map {
            when(it) {
                is SourceOption.CustomSite -> it.toRes()
                is SourceOption.BuiltinSite -> builtinMap[it.name]!!
            }
        }
    }

    fun get(name: String): SourceSiteRes? {
        val it = appdata.setting.source.sites.find { it.name == name }
        return when(it) {
            is SourceOption.CustomSite -> it.toRes()
            is SourceOption.BuiltinSite -> builtinMap[it.name]!!
            else -> null
        }
    }

    fun add(form: SiteCreateForm) {
        appdata.saveSetting {
            val sites = source.sites
            if(sites.any { it.name == form.name }) throw be(AlreadyExists("site", "name", form.name))
            for(metadata in form.additionalInfo) {
                if(!checkVariableName(metadata.field)) throw be(ParamError("availableAdditionalInfo"))
            }

            val builtin = builtinMap[form.name]
            val newSite = if(builtin != null) {
                SourceOption.BuiltinSite(form.name)
            }else{
                SourceOption.CustomSite(form.name, form.title, form.idMode, form.partMode, form.additionalInfo, form.sourceLinkRules, form.tagTypes, form.tagTypeMappings)
            }

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

    fun update(name: String, form: SiteUpdateForm) {
        appdata.saveSetting {
            val site = appdata.setting.source.sites.firstOrNull { it.name == name } ?: throw be(NotFound())
            if(site is SourceOption.BuiltinSite) throw be(BuiltinNotWritableError(name))
            site as SourceOption.CustomSite

            form.title.alsoOpt { site.title = it }
            form.sourceLinkRules.alsoOpt { site.sourceLinkRules = it }
            form.tagTypes.alsoOpt { site.tagTypes = it }
            form.tagTypeMappings.alsoOpt { site.tagTypeMappings = it }
            form.additionalInfo.alsoOpt {
                for(metadata in it) {
                    if(!checkVariableName(metadata.field)) throw be(ParamError("availableAdditionalInfo"))
                }
                site.additionalInfo = it
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

    fun remove(name: String) {
        val site = appdata.setting.source.sites.find { it.name == name }

        if(data.db.sequenceOf(Illusts).any { it.sourceSite eq name }) {
            throw be(CascadeResourceExists("Illust", "site", name))
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

        bus.emit(SettingSourceSiteChanged())
    }

    fun bulk(sites: Collection<SiteBulkForm>) {
        appdata.saveSetting {
            //确保列表里的site name不出现重复
            sites.groupBy { it.name }.mapValues { (_, v) -> v.count() }.filterValues { it > 1 }.keys.firstOrNull()?.let { throw be(AlreadyExists("site", "name", it)) }
            //依次检查所有的additionalInfo参数是否符合要求
            if(sites.mapNotNull { it.additionalInfo.unwrapOrNull() }.flatten().any { !checkVariableName(it.field) }) { throw be(ParamError("availableAdditionalInfo")) }
            val exists = source.sites.associateBy { it.name }

            val (updates, adds) = sites.filterInto { it.name in exists.keys }
            for(update in updates) {
                when(val cur = exists[update.name]!!) {
                    is SourceOption.BuiltinSite -> {
                        //对于已存在的内建项，禁止任何变更
                        if(update.title.isPresent || update.idMode.isPresent || update.partMode.isPresent || update.additionalInfo.isPresent || update.sourceLinkRules.isPresent || update.tagTypes.isPresent || update.tagTypeMappings.isPresent) {
                            throw be(BuiltinNotWritableError(update.name))
                        }
                    }
                    is SourceOption.CustomSite -> {
                        //对于已存在的自定义项，禁止更新其idMode/partMode字段
                        if(update.partMode.isPresent && update.partMode.value != cur.partMode) throw be(Reject("Param 'partMode' cannot be modified for existed site '${update.name}'."))
                        else if(update.idMode.isPresent && update.idMode.value != cur.idMode) throw be(Reject("Param 'idMode' cannot be modified for existed site '${update.name}'."))
                    }
                }
            }
            for(add in adds) {
                if(add.name in builtinMap) {
                    //对于新建的内建项，禁止任何参数
                    if(add.title.isPresent || add.idMode.isPresent || add.partMode.isPresent || add.additionalInfo.isPresent || add.sourceLinkRules.isPresent || add.tagTypes.isPresent || add.tagTypeMappings.isPresent) {
                        throw be(BuiltinNotWritableError(add.name))
                    }
                }
            }

            //检查所有需要被移除的项，是否符合可删除的要求
            val deletes = source.sites.filter { it.name !in sites.map(SiteBulkForm::name) }.map { it.name }
            if(data.db.sequenceOf(Illusts).any { it.sourceSite inList deletes }) {
                throw be(CascadeResourceExists("Illust", "site", deletes))
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
                val builtin = builtinMap[form.name]
                if(builtin != null) {
                    source.sites.add(SourceOption.BuiltinSite(form.name))
                }else if(cur != null) {
                    cur as SourceOption.CustomSite
                    source.sites.add(SourceOption.CustomSite(
                        form.name,
                        form.title.unwrapOr { cur.title },
                        cur.idMode, cur.partMode,
                        form.additionalInfo.unwrapOr { cur.additionalInfo },
                        form.sourceLinkRules.unwrapOr { cur.sourceLinkRules },
                        form.tagTypes.unwrapOr { cur.tagTypes },
                        form.tagTypeMappings.unwrapOr { cur.tagTypeMappings }
                    ))
                }else{
                    source.sites.add(SourceOption.CustomSite(
                        form.name,
                        form.title.value,
                        form.idMode.unwrapOr { SourceOption.SiteIdMode.NUMBER },
                        form.partMode.unwrapOr { SourceOption.SitePartMode.NO },
                        form.additionalInfo.unwrapOr { emptyList() },
                        form.sourceLinkRules.unwrapOr { emptyList() },
                        form.tagTypes.unwrapOr { emptyList() },
                        form.tagTypeMappings.unwrapOr { emptyMap() }
                    ))
                }
            }
        }

        bus.emit(SettingSourceSiteChanged())
    }

    private fun SourceOption.CustomSite.toRes(): SourceSiteRes {
        return SourceSiteRes(name, title ?: name, false, idMode, partMode, additionalInfo, sourceLinkRules, tagTypes, tagTypeMappings)
    }
}