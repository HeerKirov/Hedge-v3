package com.heerkirov.hedge.server.components.server.modules

import com.heerkirov.hedge.server.components.server.Modules
import com.heerkirov.hedge.server.components.status.AppStatusDriver
import com.heerkirov.hedge.server.enums.AppLoadStatus
import com.heerkirov.hedge.server.exceptions.NotInit
import com.heerkirov.hedge.server.exceptions.be
import io.javalin.Javalin
import io.javalin.http.Context

/**
 * 通用拦截模块。
 * 如果server未初始化，拦截所有的业务API，并告知。因此对appdata、database等的初始化验证在大部分handler中都可以省略。
 */
class Aspect(private val appStatus: AppStatusDriver) : Modules {
    @Volatile
    private var loaded: Boolean = false

    override fun handle(javalin: Javalin) {
        javalin.before("/api", ::aspectByInit)
    }

    private fun aspectByInit(ctx: Context) {
        if(!loaded) {
            if(appStatus.status == AppLoadStatus.READY) {
                loaded = true
            }else{
                throw be(NotInit())
            }
        }
    }
}