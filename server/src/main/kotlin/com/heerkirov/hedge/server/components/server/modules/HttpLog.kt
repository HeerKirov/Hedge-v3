package com.heerkirov.hedge.server.components.server.modules

import com.heerkirov.hedge.server.components.server.Modules
import io.javalin.Javalin
import io.javalin.http.HandlerType
import org.slf4j.Logger
import org.slf4j.LoggerFactory

class HttpLog : Modules {
    private val log: Logger = LoggerFactory.getLogger(HttpLog::class.java)

    override fun handle(javalin: Javalin) {
        javalin.after { ctx ->
            if(ctx.method() == HandlerType.POST || ctx.method() == HandlerType.PUT || ctx.method() == HandlerType.PATCH || ctx.method() == HandlerType.DELETE) {
                if(ctx.contentType() == "application/json") {
                    val result = ctx.body()
                    if(result.length <= 250) {
                        log.info("${ctx.statusCode()} ${ctx.method()} ${ctx.path()} - $result")
                        return@after
                    }
                }
                log.info("${ctx.statusCode()} ${ctx.method()} ${ctx.path()}")
            }
        }
    }
}