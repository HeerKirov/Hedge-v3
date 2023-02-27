package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.*
import com.heerkirov.hedge.server.constants.Ui
import com.heerkirov.hedge.server.dto.form.MetaOptionUpdateForm
import com.heerkirov.hedge.server.events.SettingMetaChanged
import com.heerkirov.hedge.server.exceptions.InvalidColorError
import com.heerkirov.hedge.server.exceptions.be

class SettingMetaService(private val data: DataRepository, private val bus: EventBus) {
    fun get(): MetaOption {
        return data.setting.meta
    }

    fun update(form: MetaOptionUpdateForm) {
        form.authorColors.alsoOpt { m -> m.values.find { !Ui.USEFUL_COLORS.contains(it) }?.let { throw be(InvalidColorError(it)) } }
        form.topicColors.alsoOpt { m -> m.values.find { !Ui.USEFUL_COLORS.contains(it) }?.let { throw be(InvalidColorError(it)) } }

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
}