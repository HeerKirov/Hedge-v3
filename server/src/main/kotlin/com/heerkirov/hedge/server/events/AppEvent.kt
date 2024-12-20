package com.heerkirov.hedge.server.events

import com.heerkirov.hedge.server.components.backend.BackgroundTaskType
import com.heerkirov.hedge.server.enums.AppLoadStatus

/**
 * 服务器事件，指服务器系统相关状态变更。
 */
interface AppEvent : BaseBusEvent

/**
 * AppStatus发生变化。
 */
class AppStatusChanged(val status: AppLoadStatus) : BaseBusEventImpl("app/app-status/changed"), AppEvent

/**
 * 主页的state相关内容发生变化。
 */
object HomepageStateChanged : BaseBusEventImpl("app/homepage/state/changed"), AppEvent

/**
 * 中转站内容发生变化。
 */
data class StagingPostChanged(val added: List<Int>, val moved: List<Int>, val deleted: List<Int>) : BaseBusEventImpl("app/staging-post/changed"), AppEvent

/**
 * 速查项的状态发生变化。
 */
data class QuickFindChanged(val id: Int) : BaseBusEventImpl("app/quick-find/changed"), AppEvent

/**
 * 某类后台任务的量值发生变化。
 */
data class BackgroundTaskChanged(val type: BackgroundTaskType, val currentValue: Int, val maxValue: Int) : BaseBusEventImpl("app/background-task/changed"), AppEvent