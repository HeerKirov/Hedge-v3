package com.heerkirov.hedge.server.components.service

import com.heerkirov.hedge.server.functions.service.*
import com.heerkirov.hedge.server.library.framework.Component

class AllServices(
    val illust: IllustService,
    val book: BookService,
    val folder: FolderService,
    val partition: PartitionService,
    val import: ImportService,
    val tag: TagService,
    val annotation: AnnotationService,
    val author: AuthorService,
    val topic: TopicService,
    val sourceData: SourceDataService,
    val sourceMapping: SourceMappingService,
    val settingAppdata: SettingAppdataService,
    val settingMeta: SettingMetaService,
    val settingQuery: SettingQueryService,
    val settingImport: SettingImportService,
    val settingSource: SettingSourceService,
    val settingFindSimilar: SettingFindSimilarService,
    val queryService: QueryService,
    val findSimilar: FindSimilarService,
    val metaUtil: MetaUtilService,
    val illustUtil: IllustUtilService,
    val pickerUtil: PickerUtilService
) : Component