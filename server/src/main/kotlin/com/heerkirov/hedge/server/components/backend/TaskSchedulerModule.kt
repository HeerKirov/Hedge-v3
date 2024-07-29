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
import org.quartz.*
import org.quartz.impl.StdSchedulerFactory
import org.slf4j.LoggerFactory
import java.util.*
import kotlin.collections.ArrayList

/**
 * 用于定时/条件执行的任务管理的总线模块。
 * 所有的已注册任务都将在程序启动后依次执行一次。除此之外，在remote模式下，所有任务还将在每日开始时执行一次。这里的每日定义依赖于设置项。
 */
class TaskSchedulerModule(private val appStatus: AppStatusDriver, private val appdata: AppDataManager, private val bus: EventBus, private val options: ApplicationOptions) : DaemonThreadComponent {
    private val log = LoggerFactory.getLogger(TaskSchedulerModule::class.java)

    private val startDays = ArrayList<() -> Unit>()
    private val endDays = ArrayList<() -> Unit>()

    private var scheduler: Scheduler? = null
    @Volatile private var currentOffsetHour: Int? = null

    override fun load() {
        scheduler = if(options.remoteMode) {
            StdSchedulerFactory(Properties().also {
                it["org.quartz.scheduler.instanceName"] = "TaskScheduler"
                it["org.quartz.threadPool.threadCount"] = "1"
            }).scheduler
        } else null
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
                    // 取消已有的定时任务（如果有的话）
                    scheduler!!.deleteJob(JobKey.jobKey("myJob", "group1"))

                    // 创建新的JobDetail
                    val job = JobBuilder.newJob(ScheduledJob::class.java)
                        .withIdentity("ScheduledTask", "group1")
                        .build()

                    // 计算Cron表达式
                    val cronExpression = "0 0 ${offsetHour % 24} * * ?"

                    // 创建新的Trigger
                    val trigger = TriggerBuilder.newTrigger()
                        .withIdentity("ScheduledTaskTrigger", "group1")
                        .withSchedule(CronScheduleBuilder.cronSchedule(cronExpression))
                        .build()

                    // 调度新的任务
                    scheduler!!.scheduleJob(job, trigger)
                    currentOffsetHour = offsetHour
                    log.info("Trigger created with cron '$cronExpression'.")
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

    private inner class ScheduledJob : Job {
        override fun execute(context: JobExecutionContext) {
            log.info("Have a nice day.")
            endDays.asReversed().forEach { it() }
            startDays.forEach { it() }
        }
    }
}
