package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.appdata.*
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.dto.form.ServiceOptionUpdateForm
import com.heerkirov.hedge.server.events.SettingServiceChanged

class SettingAppdataService(private val appdata: AppDataManager, private val bus: EventBus) {
    fun getService(): ServiceOption {
        return appdata.appdata.service
    }

    fun updateService(form: ServiceOptionUpdateForm) {
        appdata.save {
            form.port.alsoOpt { service.port = it }
            form.storagePath.alsoOpt { service.storagePath = it }
        }

        bus.emit(SettingServiceChanged(form))
    }
}