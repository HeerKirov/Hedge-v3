package com.heerkirov.hedge.server.events

import com.heerkirov.hedge.server.enums.AppLoadStatus

/**
 * 服务器事件，指服务器系统相关状态变更。
 */
interface AppEvent : BaseBusEvent

/**
 * AppStatus发生变化。
 */
class AppStatusChanged(val status: AppLoadStatus) : BaseBusEventImpl("APP.APP_STATUS.CHANGED"), AppEvent