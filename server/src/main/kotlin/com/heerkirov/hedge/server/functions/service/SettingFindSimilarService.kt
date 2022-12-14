package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.*
import com.heerkirov.hedge.server.dto.form.FindSimilarOptionUpdateForm
import com.heerkirov.hedge.server.events.SettingFindSimilarChanged

class SettingFindSimilarService(private val data: DataRepository, private val bus: EventBus) {
    fun get(): FindSimilarOption {
        return data.setting.findSimilar
    }

    fun update(form: FindSimilarOptionUpdateForm) {
        data.syncSetting {
            data.saveSetting {
                form.autoFindSimilar.alsoOpt { findSimilar.autoFindSimilar = it }
                form.autoTaskConf.alsoOpt { findSimilar.autoTaskConf = it }
                form.defaultTaskConf.alsoOpt { findSimilar.defaultTaskConf = it }
            }
        }

        bus.emit(SettingFindSimilarChanged())
    }
}