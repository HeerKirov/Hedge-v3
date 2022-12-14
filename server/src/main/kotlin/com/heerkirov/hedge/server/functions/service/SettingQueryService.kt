package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.*
import com.heerkirov.hedge.server.dto.form.QueryOptionUpdateForm
import com.heerkirov.hedge.server.events.SettingQueryChanged

class SettingQueryService(private val data: DataRepository, private val bus: EventBus) {
    fun get(): QueryOption {
        return data.setting.query
    }

    fun update(form: QueryOptionUpdateForm) {
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
}