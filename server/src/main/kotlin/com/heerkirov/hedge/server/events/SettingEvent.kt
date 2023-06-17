package com.heerkirov.hedge.server.events

/**
 * 服务器事件，指服务器系统相关状态变更。
 */
interface SettingEvent : BaseBusEvent

class SettingServiceChanged : BaseBusEventImpl("setting/service/changed"), SettingEvent

class SettingMetaChanged : BaseBusEventImpl("setting/meta/changed"), SettingEvent

class SettingFileChanged : BaseBusEventImpl("setting/file/changed"), SettingEvent

class SettingQueryChanged : BaseBusEventImpl("setting/query/changed"), SettingEvent

class SettingImportChanged : BaseBusEventImpl("setting/import/changed"), SettingEvent

class SettingFindSimilarChanged : BaseBusEventImpl("setting/find-similar/changed"), SettingEvent

class SettingSourceSiteChanged : BaseBusEventImpl("setting/source-site/changed"), SettingEvent