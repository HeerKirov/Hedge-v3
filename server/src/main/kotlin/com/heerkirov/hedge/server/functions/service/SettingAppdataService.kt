package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.appdata.*
import com.heerkirov.hedge.server.dto.form.ProxyOptionUpdateForm
import com.heerkirov.hedge.server.dto.form.ServiceOptionUpdateForm

class SettingAppdataService(private val appdata: AppDataManager) {
    fun getService(): ServiceOption {
        return appdata.appdata.service
    }

    fun updateService(form: ServiceOptionUpdateForm) {
        appdata.save {
            form.port.alsoOpt { service.port = it }
            form.storagePath.alsoOpt { service.storagePath = it }
        }
    }

    fun getProxy(): ProxyOption {
        return appdata.appdata.proxy
    }

    fun updateProxy(form: ProxyOptionUpdateForm) {
        appdata.save {
            form.httpProxy.alsoOpt { proxy.httpProxy = it }
            form.socks5Proxy.alsoOpt { proxy.socks5Proxy = it }
        }
    }
}