package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.dto.res.StorageStatusRes

class ServiceService(private val appdata: AppDataManager) {
    fun getStorageStatus(): StorageStatusRes {
        return StorageStatusRes(
            appdata.storage.storageDir,
            appdata.storage.accessible,
            appdata.storage.cacheDir,
            appdata.storage.cacheSize
        )
    }
}