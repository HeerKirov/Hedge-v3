package com.heerkirov.hedge.server.components.lifetime

import com.heerkirov.hedge.server.library.framework.FrameworkContext
import com.heerkirov.hedge.server.library.framework.StatefulComponent
import com.heerkirov.hedge.server.library.framework.ThreadComponent
import org.slf4j.Logger
import org.slf4j.LoggerFactory

/**
 * 负责生命周期维持的组件。因为server一般不允许无限制地在后台运行，就需要各种机制来配合web、client、cli，确保它们在使用时server不会退出。
 * 1. 提供注册+心跳机制。client注册一个存在ID，并需要按要求隔一段时间发送一个心跳信号。收不到心跳，或收到一个撤销信号时移除此存在序号。
 * 3. 除此之外，生命周期维持还要看其他组件的空闲情况。每过一段时间检查其他有状态组件是否空闲，所有有状态组件都空闲时才允许退出。
 * 4. 最后，还允许用户直接将此组件设定为永久持续。
 */
interface Lifetime : ThreadComponent {
    /**
     * 永久存续标记管理。当存在永久存续标记时，server不会退出。
     */
    val permanent: Permanent

    /**
     * 心跳状态管理。仍存在可用的心跳信号时，server不会退出。
     */
    val heartSignal: HeartSignal

    /**
     * 连接会话管理。仍存在已建立的维持连接时，server不会退出。
     */
    val session: Session

    /**
     * 启动生命周期维持线程。使用此方法阻塞主线程。
     */
    override fun thread()
}

data class LifetimeOptions(
    val permanent: Boolean = false,
    val defaultSignalInterval: Long = 1000L * 60,
    val threadInterval: Long = 1000L * 5,
    val threadContinuousCount: Int = 1
)

class LifetimeImpl(private val context: FrameworkContext, private val options: LifetimeOptions) : Lifetime {
    private val log: Logger = LoggerFactory.getLogger(LifetimeImpl::class.java)

    private lateinit var statefulComponents: List<StatefulComponent>

    override val heartSignal: HeartSignal = HeartSignal(options)
    override val permanent: Permanent = Permanent()
    override val session: Session = Session()

    override fun load() {
        if(options.permanent) {
            permanent["Startup Permanent Flag"] = true
        }
        statefulComponents = context.getComponents().filterIsInstance<StatefulComponent>()
    }

    override fun thread() {
        var continuous = 0
        while (true) {
            Thread.sleep(options.threadInterval)
            //进行信号清理
            heartSignal.update()

            if(anySignal(statefulComponents)) {
                //存在任意一种信号响应，就继续循环
                if(continuous > 0) {
                    log.info("New signal found in lifetime. Subsisting state is exited.")
                    continuous = 0
                }
                continue
            }else{
                if(continuous == 0) {
                    log.info("No signal exists in lifetime. It will be into subsisting state as most ${(options.threadInterval * options.threadContinuousCount / 1000).toInt()}s.")
                }
                //不存在就进入存续期
                continuous += 1
                //在存续期进入N次都没有新的信号后，退出阻塞线程，程序终止
                if(continuous > options.threadContinuousCount) break
            }
        }
    }

    private fun anySignal(statefulComponents: List<StatefulComponent>): Boolean {
        if(permanent.anyPermanent) {
            //在开启永久模式时，不会执行其他判断，总是继续循环
            return true
        }else if(session.anySession) {
            //还存在未关闭的连接会话，意味着继续执行
            return true
        }else if(heartSignal.anySignal) {
            //还存在未过期的信号，意味着继续执行
            return true
        }else if(statefulComponents.any { !it.isIdle }) {
            //任一有状态组件没有空闲，意味着还有任务在执行
            return true
        }
        return false
    }
}