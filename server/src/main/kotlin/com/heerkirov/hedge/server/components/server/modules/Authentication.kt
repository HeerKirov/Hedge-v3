package com.heerkirov.hedge.server.components.server.modules

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.server.Modules
import com.heerkirov.hedge.server.dto.res.ErrorResult
import com.heerkirov.hedge.server.dto.res.WsResult
import com.heerkirov.hedge.server.exceptions.*
import io.javalin.Javalin
import io.javalin.http.Context
import io.javalin.http.HandlerType
import io.javalin.websocket.WsConfig

/**
 * 登录认证模块。
 * 使用before handler拦截所有需要认证的API，验证其token，检验token是否能访问目标API，然后放通。
 */
class Authentication(private val baseToken: String, private val appdata: AppDataManager) : Modules {
    private val prefixBearer = "bearer "

    override fun handle(javalin: Javalin) {
        javalin.before("/api/*", ::authenticate)
            .before("/app/*", ::authenticate)
            .wsBefore("/websocket", ::wsAuthenticate)
    }

    private fun authenticate(ctx: Context) {
        //对于OPTIONS method放行
        if(ctx.method() == HandlerType.OPTIONS) return
        val bearer = ctx.header("Authorization") ?: throw be(NoToken)
        val userToken = if(bearer.substring(0, prefixBearer.length).lowercase() == prefixBearer) bearer.substring(prefixBearer.length) else throw be(NoToken)

        if(baseToken == userToken) {
            //通过baseToken的验证
            return
        }else if(appdata.setting.server.token != null && appdata.setting.server.token == userToken) {
            //通过自定义token的验证
            return
        }else{
            throw be(TokenWrong)
        }
    }

    private fun wsAuthenticate(ws: WsConfig) {
        ws.onConnect {
            val token = it.queryParam("access_token")
            if(token == null) {
                it.send(WsResult("ERROR", ErrorResult(NoToken)))
                it.closeSession()
            }else if (token != baseToken) {
                it.send(WsResult("ERROR", ErrorResult(TokenWrong)))
                it.closeSession()
            }
        }
    }
}