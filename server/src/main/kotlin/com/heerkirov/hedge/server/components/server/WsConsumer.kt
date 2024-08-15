package com.heerkirov.hedge.server.components.server

import com.heerkirov.hedge.server.utils.Json.toJSONString
import com.heerkirov.hedge.server.utils.tools.loopPoolThread
import io.javalin.websocket.*
import org.slf4j.LoggerFactory
import java.nio.channels.ClosedChannelException
import java.util.function.Consumer

/**
 * WebSocket适配封装模块。本身作为Consumer被提供给ws注册。
 * 1. 提供将session封装管理的功能，自动管理session。
 * 2. 提供authentication功能，并拦截未认证的消息。
 */
class WsConsumer(ctx: (WsConsumer.() -> Unit)? = null) : Consumer<WsConfig> {
    private val log = LoggerFactory.getLogger(WsConsumer::class.java)

    private val connections: MutableSet<WsContext> = mutableSetOf()
    private val whenConnectConsumers: MutableSet<(String) -> Unit> = mutableSetOf()
    private val whenCloseConsumers: MutableSet<(String) -> Unit> = mutableSetOf()
    private val whenReceiveMessageConsumers: MutableSet<(String, String) -> Unit> = mutableSetOf()
    private val pingThread = loopPoolThread(false) { pingThread() }

    init { ctx?.invoke(this) }

    override fun accept(ws: WsConfig) {
        ws.onConnect(::onConnectEvent)
        ws.onClose(::onCloseEvent)
        ws.onError(::onErrorEvent)
        ws.onMessage(::onMessageEvent)
    }

    private fun pingThread() {
        Thread.sleep(1000L * 30)
        connections.forEach { it.sendPing() }
    }

    private fun onConnectEvent(ctx: WsConnectContext) {
        connections.add(ctx)
        whenConnectConsumers.forEach { it(ctx.sessionId()) }
        log.info("connection (${ctx.sessionId()}) ${ctx.session.remoteAddress} established.")

        pingThread.start()
    }

    private fun onCloseEvent(ctx: WsCloseContext) {
        connections.remove(ctx)
        whenCloseConsumers.forEach { it(ctx.sessionId()) }
        log.info("connection (${ctx.sessionId()}) closed.")

        if(connections.isEmpty()) pingThread.stop()
    }

    private fun onErrorEvent(ctx: WsErrorContext) {
        connections.remove(ctx)
        whenCloseConsumers.forEach { it(ctx.sessionId()) }
        val e = ctx.error()
        if(e !is ClosedChannelException) {
            log.info("connection ${ctx.sessionId()} error: ${ctx.error()}")
        }

        if(connections.isEmpty()) pingThread.stop()
    }

    private fun onMessageEvent(ctx: WsMessageContext) {
        whenReceiveMessageConsumers.forEach { it(ctx.sessionId(), ctx.message()) }
        log.info("connection ${ctx.sessionId()} message: ${ctx.message()}")
    }

    /**
     * 添加一个回调。当新的连接加入时，调用此回调。
     */
    fun onConnect(consumer: (String) -> Unit) {
        whenConnectConsumers.add(consumer)
    }

    /**
     * 添加一个回调。当已有连接关闭时，调用此回调。
     */
    fun onClose(consumer: (String) -> Unit) {
        whenCloseConsumers.add(consumer)
    }

    /**
     * 添加一个回调。当已有连接发送消息时，调用此回调。
     */
    fun onMessage(consumer: (String, String) -> Unit) {
        whenReceiveMessageConsumers.add(consumer)
    }

    /**
     * 向所有连接广播一条消息。
     */
    private fun sendMessage(message: String) {
        connections.forEach { it.send(message) }
    }

    /**
     * 向所有连接广播一条消息。此消息会被转换为json结构。
     */
    fun sendMessage(message: Any) {
        sendMessage(message.toJSONString())
    }
}