package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.appdata.saveSetting
import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.components.lifetime.Lifetime
import com.heerkirov.hedge.server.components.status.AppStatusDriver
import com.heerkirov.hedge.server.enums.AppLoadStatus
import com.heerkirov.hedge.server.exceptions.Reject
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.library.form.bodyAsForm
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.config.JavalinConfig
import io.javalin.http.Context


class AppRoutes(private val lifetime: Lifetime, private val appStatus: AppStatusDriver, private val appdata: AppDataManager) : Routes {
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
            }
        }
    }

    private fun health(ctx: Context) {
        ctx.json(HealthResponse(status = appStatus.status))
    }

    private fun initialize(ctx: Context) {
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
        ctx.json(this.lifetime.permanent.stats)
    }

    private fun updatePermanent(ctx: Context) {
        val form = ctx.bodyAsForm<PermanentForm>()
        this.lifetime.permanent[form.type] = form.value
        ctx.json(this.lifetime.permanent.stats)
    }

    private fun addSignal(ctx: Context) {
        val form = ctx.bodyAsForm<SignalForm>()
        this.lifetime.heartSignal.signal(form.interval)
    }

    data class InitializeForm(val storagePath: String? = null)

    data class PermanentForm(val type: String, val value: Boolean)

    data class SignalForm(val interval: Long?)

    data class HealthResponse(val status: AppLoadStatus)
}