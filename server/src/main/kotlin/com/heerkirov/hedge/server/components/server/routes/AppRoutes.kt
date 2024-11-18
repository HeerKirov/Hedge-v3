package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.application.ApplicationOptions
import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.appdata.saveSetting
import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.components.lifetime.Lifetime
import com.heerkirov.hedge.server.components.status.AppStatusDriver
import com.heerkirov.hedge.server.enums.AppLoadStatus
import com.heerkirov.hedge.server.exceptions.OnlyForLocal
import com.heerkirov.hedge.server.exceptions.Reject
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.library.form.bodyAsForm
import com.heerkirov.hedge.server.utils.listLogFiles
import com.heerkirov.hedge.server.utils.readLogFile
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.config.JavalinConfig
import io.javalin.http.ContentType
import io.javalin.http.Context
import io.javalin.http.queryParamAsClass
import java.io.FileNotFoundException


class AppRoutes(private val lifetime: Lifetime, private val appStatus: AppStatusDriver, private val appdata: AppDataManager, private val options: ApplicationOptions) : Routes {
    override fun handle(javalin: JavalinConfig) {
        javalin.router.apiBuilder {
            path("app") {
                get("health", ::health)
                post("initialize", ::initialize)
                path("lifetime") {
                    path("session") {
                        get(::getSession)
                    }
                    path("permanent") {
                        get(::getPermanentList)
                        post(::updatePermanent)
                    }
                    post("signal", ::addSignal)
                }
                get("storage", ::getStorageStatus)
                path("logs") {
                    get(::getLogList)
                    get("{log}", ::getLog)
                }
            }
        }
    }

    private fun health(ctx: Context) {
        ctx.json(HealthResponse(status = appStatus.status))
    }

    private fun initialize(ctx: Context) {
        if(options.remoteMode) throw be(OnlyForLocal)

        val form = ctx.bodyAsForm<InitializeForm>()

        if(appStatus.status != AppLoadStatus.NOT_INITIALIZED) {
            throw be(Reject("Server is already initialized."))
        }

        appStatus.initialize()

        appdata.saveSetting {
            this.storage.storagePath = form.storagePath
        }
    }

    private fun getSession(ctx: Context) {
        ctx.json(this.lifetime.session.sessions)
    }

    private fun getPermanentList(ctx: Context) {
        if(options.remoteMode) throw be(OnlyForLocal)

        ctx.json(this.lifetime.permanent.stats)
    }

    private fun updatePermanent(ctx: Context) {
        if(options.remoteMode) throw be(OnlyForLocal)

        val form = ctx.bodyAsForm<PermanentForm>()
        this.lifetime.permanent[form.type] = form.value
        ctx.json(this.lifetime.permanent.stats)
    }

    private fun addSignal(ctx: Context) {
        if(options.remoteMode) throw be(OnlyForLocal)

        val form = ctx.bodyAsForm<SignalForm>()
        this.lifetime.heartSignal.signal(form.interval)
    }

    private fun getStorageStatus(ctx: Context) {
        ctx.json(StorageStatusResponse(
            if(options.remoteMode) "" else appdata.storage.storageDir,
            appdata.storage.accessible,
            appdata.storage.storageSize
        ))
    }

    private fun getLogList(ctx: Context) {
        ctx.json(listLogFiles(options.serverDir))
    }

    private fun getLog(ctx: Context) {
        val filename = ctx.pathParam("log")
        val offset = ctx.queryParamAsClass<Long>("offset").getOrDefault(0)

        val (stream, size) = try {
            readLogFile(options.serverDir, filename, offset)
        }catch (e: FileNotFoundException) {
            ctx.status(404)
            return
        }

        if(size <= 0) {
            ctx.status(204).contentType(ContentType.TEXT_PLAIN)
            return
        }

        ctx.result(stream)
            .header("X-New-Offset", size.toString())
            .header("Access-Control-Expose-Headers", "X-New-Offset")
            .contentType(ContentType.TEXT_PLAIN)
    }

    data class InitializeForm(val storagePath: String? = null)

    data class PermanentForm(val type: String, val value: Boolean)

    data class SignalForm(val interval: Long?)

    data class HealthResponse(val status: AppLoadStatus)

    data class StorageStatusResponse(val storageDir: String,
                                     val storageAccessible: Boolean,
                                     val storageSize: Long)
}