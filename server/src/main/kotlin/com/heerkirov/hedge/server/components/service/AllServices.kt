package com.heerkirov.hedge.server.components.service

import com.heerkirov.hedge.server.functions.service.*
import com.heerkirov.hedge.server.library.framework.Component

class AllServices(
    val homepage: HomepageService,
    val illust: IllustService,
    val book: BookService,
    val folder: FolderService,
    val partition: PartitionService,
    val import: ImportService,
    val stagingPost: StagingPostService,
    val trash: TrashService,
    val tag: TagService,
    val annotation: AnnotationService,
    val author: AuthorService,
    val topic: TopicService,
    val sourceData: SourceDataService,
    val sourceMapping: SourceMappingService,
    val sourceMark: SourceMarkService,
    val setting: SettingService,
    val queryService: QueryService,
    val findSimilar: FindSimilarService,
    val exportUtil: ExportUtilService,
    val metaUtil: MetaUtilService,
    val illustUtil: IllustUtilService,
    val pickerUtil: PickerUtilService
) : Component