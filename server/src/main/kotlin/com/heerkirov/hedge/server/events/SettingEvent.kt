package com.heerkirov.hedge.server.events

/**
 * 服务器事件，指服务器系统相关状态变更。
 */
interface SettingEvent : BaseBusEvent

class SettingServerChanged : BaseBusEventImpl("setting/server/changed"), SettingEvent

class SettingMetaChanged : BaseBusEventImpl("setting/meta/changed"), SettingEvent

class SettingArchiveChanged : BaseBusEventImpl("setting/storage/changed"), SettingEvent

class SettingQueryChanged : BaseBusEventImpl("setting/query/changed"), SettingEvent

class SettingImportChanged : BaseBusEventImpl("setting/import/changed"), SettingEvent

class SettingFindSimilarChanged : BaseBusEventImpl("setting/find-similar/changed"), SettingEvent

class SettingSourceSiteChanged : BaseBusEventImpl("setting/source-site/changed"), SettingEvent