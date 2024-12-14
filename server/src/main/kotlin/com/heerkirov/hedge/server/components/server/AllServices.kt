package com.heerkirov.hedge.server.components.server

import com.heerkirov.hedge.server.functions.service.*

class AllServices(
    val homepage: HomepageService,
    val illust: IllustService,
    val book: BookService,
    val folder: FolderService,
    val import: ImportService,
    val stagingPost: StagingPostService,
    val trash: TrashService,
    val tag: TagService,
    val author: AuthorService,
    val topic: TopicService,
    val sourceData: SourceDataService,
    val sourceMapping: SourceMappingService,
    val setting: SettingService,
    val note: NoteService,
    val query: QueryService,
    val findSimilar: FindSimilarService,
    val exportUtil: ExportUtilService,
    val metaUtil: MetaEditorService,
    val illustUtil: IllustUtilService,
    val pickerUtil: PickerUtilService,
    val fileUtil: FileUtilService
)