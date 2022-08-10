package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.database.*
import com.heerkirov.hedge.server.dto.form.MetaOptionUpdateForm

class SettingMetaService(private val data: DataRepository) {
    fun get(): MetaOption {
        return data.setting.meta
    }

    fun update(form: MetaOptionUpdateForm) {
        data.syncSetting {
            saveSetting {
                form.autoCleanTagme.alsoOpt { meta.autoCleanTagme = it }
                form.scoreDescriptions.alsoOpt { meta.scoreDescriptions = it }
                form.topicColors.alsoOpt { meta.topicColors = it }
                form.authorColors.alsoOpt { meta.authorColors = it }
            }
        }
    }
}