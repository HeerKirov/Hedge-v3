package com.heerkirov.hedge.server.components.backend

import com.heerkirov.hedge.server.application.ApplicationOptions
import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.status.AppStatusDriver
import com.heerkirov.hedge.server.enums.AppLoadStatus
import com.heerkirov.hedge.server.events.AppStatusChanged
import com.heerkirov.hedge.server.events.PackagedBusEvent
import com.heerkirov.hedge.server.events.SettingServerChanged
import com.heerkirov.hedge.server.library.framework.DaemonThreadComponent
import org.slf4j.LoggerFactory
import java.time.LocalTime
import java.time.temporal.ChronoUnit
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit
import kotlin.collections.ArrayList

/**
 * 用于定时/条件执行的任务管理的总线模块。
 * 所有的已注册任务都将在程序启动后依次执行一次。除此之外，在remote模式下，所有任务还将在每日开始时执行一次。这里的每日定义依赖于设置项。
 */
class TaskSchedulerModule(private val appStatus: AppStatusDriver, private val appdata: AppDataManager, private val bus: EventBus, private val options: ApplicationOptions) : DaemonThreadComponent {
    private val log = LoggerFactory.getLogger(TaskSchedulerModule::class.java)

    private val startDays = ArrayList<() -> Unit>()
    private val endDays = ArrayList<() -> Unit>()

    private var scheduler: ScheduledExecutorService? = null
    @Volatile private var future: ScheduledFuture<*>? = null
    @Volatile private var currentOffsetHour: Int? = null

    override fun load() {
        scheduler = if(options.remoteMode) Executors.newScheduledThreadPool(1) else null
    }

    override fun thread() {
        if(appStatus.status == AppLoadStatus.READY) {
            //在app READY时，首先进行一次初始化执行
            startDays.forEach { it() }
            //然后，在remote模式下，启动调度，并注册setting变更的监听事件
            if(options.remoteMode) {
                schedule(appdata.setting.server.timeOffsetHour ?: 0)
                bus.on(SettingServerChanged::class, ::onSettingChanged)
            }
        }else if(options.remoteMode) {
            //app尚未READY时，若在remote模式下，就要监听app何时进入READY，并在那之后启动调度和注册setting变更的监听事件
            bus.on(AppStatusChanged::class) { e ->
                e.which {
                    all<AppStatusChanged> {
                        if(currentOffsetHour == null && it.any { e -> e.status == AppLoadStatus.READY }) {
                            schedule(appdata.setting.server.timeOffsetHour ?: 0)
                            bus.on(SettingServerChanged::class, ::onSettingChanged)
                        }
                    }
                }
            }
        }
    }

    override fun close() {
        if(appStatus.status == AppLoadStatus.READY) {
            //在app READY时，进行一次反向的结束执行
            endDays.asReversed().forEach { it() }
        }
        scheduler?.shutdown()
    }

    /**
     * 注册一个每日事件。该事件将在load序列结束之后依次调用，remote模式下还将在每日开始时调用。
     * 该函数应当在load开始之前(也就是每个组件init时)调用以进行注册。
     */
    fun dayStart(task: () -> Unit) {
        startDays.add(task)
    }

    /**
     * 注册一个每日事件。该事件将在close序列中依次调用，remote模式下还将在每日开始时调用。
     */
    fun dayEnd(task: () -> Unit) {
        endDays.add(task)
    }

    private fun schedule(offsetHour: Int) {
        if(scheduler != null && (offsetHour != currentOffsetHour)) {
            synchronized(scheduler!!) {
                if(offsetHour != currentOffsetHour) {
                    // 取消已有的定时任务（如果有的话
                    if(future != null) {
                        future!!.cancel(false)
                    }

                    //计算当前时间距离下次调度时间的时间间隔，作为初次调用间隔。
                    val dailyExecutionTime = LocalTime.of((offsetHour + 24) % 24, 0)
                    //获取now时，去掉nano部分，并使sec+1，避免最后算得的时间点落在定时时间之前，那会使homepage这类调度不生效
                    val now = LocalTime.now().withNano(0).plusSeconds(1)
                    val period = 60 * 60 * 24L
                    val initialDelay = (ChronoUnit.SECONDS.between(now, dailyExecutionTime) + period) % period

                    // 调度新的任务
                    future = scheduler!!.scheduleAtFixedRate(::run, initialDelay, period, TimeUnit.SECONDS)
                    currentOffsetHour = offsetHour

                    val initialText = String.format("%dh%02dm%02ds", initialDelay / 3600, initialDelay % 3600 / 60, initialDelay % 60)
                    val periodText = String.format("%dh", period / 3600)
                    log.info("Trigger created in '$dailyExecutionTime'. First schedule is after ${initialText}, period is ${periodText}.")
                }
            }
        }
    }

    private fun onSettingChanged(e: PackagedBusEvent) {
        e.which {
            all<SettingServerChanged> {
                schedule(appdata.setting.server.timeOffsetHour ?: 0)
            }
        }
    }

    private fun run() {
        log.info("Have a nice day.")
        endDays.asReversed().forEach { it() }
        startDays.forEach { it() }
    }
}
