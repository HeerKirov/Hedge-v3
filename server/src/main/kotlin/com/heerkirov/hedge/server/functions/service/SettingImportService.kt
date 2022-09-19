package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.*
import com.heerkirov.hedge.server.exceptions.InvalidRuleIndexError
import com.heerkirov.hedge.server.exceptions.ResourceNotExist
import com.heerkirov.hedge.server.dto.form.ImportOptionUpdateForm
import com.heerkirov.hedge.server.events.SettingImportChanged
import com.heerkirov.hedge.server.exceptions.be

class SettingImportService(private val data: DataRepository, private val bus: EventBus) {
    fun get(): ImportOption {
        return data.setting.import
    }

    /**
     * @throws ResourceNotExist ("site", string) rules中有给出的site不存在
     * @throws InvalidRuleIndexError (string, string) rules的index与regex不匹配
     */
    fun update(form: ImportOptionUpdateForm) {
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
            }
        }

        bus.emit(SettingImportChanged())
    }

    /**
     * @throws InvalidRuleIndexError (string, string) rule的index与regex不匹配
     */
    private fun checkImportRule(rule: ImportOption.SourceAnalyseRule, site: SourceOption.Site) {
        if((rule.secondaryIdIndex != null) xor site.hasSecondaryId) throw be(InvalidRuleIndexError(site.name, rule.regex))
    }
}