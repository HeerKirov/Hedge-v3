package com.heerkirov.hedge.server.components.http.routes

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.http.Routes
import io.javalin.Javalin
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.http.Context


class AppServiceRoutes(private val appdata: AppDataManager) : Routes {
    override fun handle(javalin: Javalin) {
        javalin.routes {
            get("api/service/storage", ::getRuntimeStorage)
        }
    }

    private fun getRuntimeStorage(ctx: Context) {
        ctx.json(Storage(appdata.storagePathAccessor.accessible, appdata.storagePathAccessor.storageDir))
    }

    data class Storage(val accessible: Boolean, val storageDir: String)
}