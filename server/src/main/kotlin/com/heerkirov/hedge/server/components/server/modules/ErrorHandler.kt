package com.heerkirov.hedge.server.components.server.modules

import com.heerkirov.hedge.server.components.server.Modules
import com.heerkirov.hedge.server.dto.res.ErrorResult
import com.heerkirov.hedge.server.dto.res.WsResult
import com.heerkirov.hedge.server.exceptions.BusinessException
import io.javalin.Javalin
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import kotlin.Exception

class ErrorHandler : Modules {
    private val log: Logger = LoggerFactory.getLogger(ErrorHandler::class.java)

    override fun handle(javalin: Javalin) {
        javalin.exception(BusinessException::class.java) { e, ctx ->
            ctx.status(e.exception.status).json(ErrorResult(e.exception))
        }.exception(Exception::class.java) { e, ctx ->
            ctx.status(500).json(ErrorResult("INTERNAL_ERROR", e.message, null))
            log.error("Unexpected exception thrown in http request.", e)
        }.wsException(BusinessException::class.java) { e, ctx ->
            ctx.send(WsResult("ERROR", ErrorResult(e.exception)))
        }.wsException(Exception::class.java) { e, _ ->
            log.error("Unexpected exception thrown in websocket session.", e)
        }
    }
}