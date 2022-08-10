package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.database.*
import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.dao.ImportImages
import com.heerkirov.hedge.server.exceptions.AlreadyExists
import com.heerkirov.hedge.server.exceptions.CascadeResourceExists
import com.heerkirov.hedge.server.exceptions.NotFound
import com.heerkirov.hedge.server.dto.form.SiteCreateForm
import com.heerkirov.hedge.server.dto.form.SiteUpdateForm
import com.heerkirov.hedge.server.exceptions.be
import org.ktorm.dsl.eq
import org.ktorm.entity.any
import org.ktorm.entity.sequenceOf

class SettingSourceService(private val data: DataRepository) {
    fun list(): List<SourceOption.Site> {
        return data.setting.source.sites
    }

    /**
     * @throws AlreadyExists ("site", "name", string) 此site name已经存在
     */
    fun create(form: SiteCreateForm) {
        data.syncSetting {
            val sites = setting.source.sites
            if(sites.any { it.name == form.name }) throw be(AlreadyExists("site", "name", form.name))

            val newSite = SourceOption.Site(form.name, form.title, form.hasSecondaryId)

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
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun get(name: String): SourceOption.Site {
        return data.setting.source.sites.firstOrNull { it.name == name } ?: throw be(NotFound())
    }

    fun update(name: String, form: SiteUpdateForm) {
        data.syncSetting {
            val site = get(name)

            saveSetting {
                form.title.alsoOpt { site.title = it }
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
    }

    /**
     * @throws CascadeResourceExists ("Illust" | "ImportImage" | "SourceAnalyseRule" | "SpiderRule") 存在某种资源仍依赖此site，无法删除
     */
    fun delete(name: String) {
        data.db.transaction {
            val site = get(name)

            if(data.db.sequenceOf(Illusts).any { it.sourceSite eq name }) {
                throw be(CascadeResourceExists("Illust"))
            }
            if(data.db.sequenceOf(ImportImages).any { it.sourceSite eq name }) {
                throw be(CascadeResourceExists("ImportImage"))
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
    }
}