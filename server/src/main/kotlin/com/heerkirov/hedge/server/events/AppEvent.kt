package com.heerkirov.hedge.server.events

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
class HomepageStateChanged : BaseBusEventImpl("app/homepage/state/changed"), AppEvent

/**
 * 中转站内容发生变化。
 */
data class StagingPostChanged(val added: List<Int>, val moved: List<Int>, val deleted: List<Int>) : BaseBusEventImpl("app/staging-post/changed"), AppEvent