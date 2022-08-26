package com.heerkirov.hedge.server.events

import com.heerkirov.hedge.server.components.database.SourceOption
import com.heerkirov.hedge.server.dto.form.*

/**
 * 服务器事件，指服务器系统相关状态变更。
 */
interface SettingEvent : BaseBusEvent

data class SettingServiceChanged(val serviceOption: ServiceOptionUpdateForm) : BaseBusEventImpl("setting/service/changed"), SettingEvent

data class SettingMetaChanged(val metaOption: MetaOptionUpdateForm) : BaseBusEventImpl("setting/meta/changed"), SettingEvent

data class SettingQueryChanged(val queryOption: QueryOptionUpdateForm) : BaseBusEventImpl("setting/query/changed"), SettingEvent

data class SettingImportChanged(val importOption: ImportOptionUpdateForm) : BaseBusEventImpl("setting/import/changed"), SettingEvent

data class SettingFindSimilarChanged(val findSimilarOption: FindSimilarOptionUpdateForm) : BaseBusEventImpl("setting/find-similar/changed"), SettingEvent

data class SettingSourceSiteChanged(val sites: List<SourceOption.Site>) : BaseBusEventImpl("setting/source-site/changed"), SettingEvent