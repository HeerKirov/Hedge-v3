package com.heerkirov.hedge.server.application

import com.heerkirov.hedge.server.components.appdata.AppDataManagerImpl
import com.heerkirov.hedge.server.components.backend.FileGeneratorImpl
import com.heerkirov.hedge.server.components.backend.exporter.BackendExporterImpl
import com.heerkirov.hedge.server.components.backend.similar.SimilarFinderImpl
import com.heerkirov.hedge.server.components.bus.EventBusImpl
import com.heerkirov.hedge.server.components.database.DataRepositoryImpl
import com.heerkirov.hedge.server.components.health.HealthImpl
import com.heerkirov.hedge.server.components.http.HttpServerImpl
import com.heerkirov.hedge.server.components.http.HttpServerOptions
import com.heerkirov.hedge.server.components.lifetime.LifetimeImpl
import com.heerkirov.hedge.server.components.lifetime.LifetimeOptions
import com.heerkirov.hedge.server.components.service.*
import com.heerkirov.hedge.server.components.status.AppStatusDriverImpl
import com.heerkirov.hedge.server.functions.manager.query.QueryManager
import com.heerkirov.hedge.server.functions.manager.*
import com.heerkirov.hedge.server.functions.service.*
import com.heerkirov.hedge.server.functions.kit.*
import com.heerkirov.hedge.server.library.framework.define
import com.heerkirov.hedge.server.library.framework.framework

/**
 * 应用程序的入口函数。在这里对整个应用程序进行装配。
 */
fun runApplication(options: ApplicationOptions) {
    val lifetimeOptions = LifetimeOptions(options.permanent)
    val serverOptions = HttpServerOptions(options.forceToken, options.forcePort)

    framework {
        val eventBus = define { EventBusImpl(context) }
        val health = define { HealthImpl(options.channelPath) }
        val lifetime = define { LifetimeImpl(context, lifetimeOptions) }
        val appStatus = define { AppStatusDriverImpl(context, options.channelPath) }
        val appdata = define { AppDataManagerImpl(options.channelPath) }
        val repo = define { DataRepositoryImpl(options.channelPath) }

        val services = define {
            val queryManager = QueryManager(repo)
            val queryService = QueryService(queryManager)

            val sourceTagManager = SourceTagManager(repo)
            val sourceBookManager = SourceBookManager(repo)
            val sourceManager = SourceDataManager(repo, queryManager, sourceTagManager, sourceBookManager)
            val sourceMappingManager = SourceMappingManager(repo, sourceTagManager)
            val sourceDataService = SourceDataService(repo, sourceManager, queryManager)
            val sourceMappingService = SourceMappingService(repo, sourceMappingManager)

            val similarFinder = define { SimilarFinderImpl(appStatus, repo) }

            val thumbnailGenerator = define { FileGeneratorImpl(appStatus, appdata, repo) }
            val fileManager = FileManager(appdata, repo)
            val importMetaManager = ImportMetaManager(repo)
            val importManager = ImportManager(repo, importMetaManager, fileManager, thumbnailGenerator)

            val annotationKit = AnnotationKit(repo)
            val annotationManager = AnnotationManager(repo)

            val historyRecordManager = HistoryRecordManager(repo)
            val authorKit = AuthorKit(repo, annotationManager)
            val topicKit = TopicKit(repo, annotationManager)
            val tagKit = TagKit(repo, annotationManager)
            val metaUtilKit = MetaUtilKit(repo)
            val metaManager = MetaManager(repo)
            val metaService = MetaUtilService(repo, metaUtilKit, metaManager, historyRecordManager)

            val partitionManager = PartitionManager(repo)

            val illustKit = IllustKit(repo, metaManager)
            val bookKit = BookKit(repo, metaManager)
            val backendExporter = define { BackendExporterImpl(appStatus, repo, illustKit, bookKit) }
            val illustManager = IllustManager(repo, illustKit, sourceManager, partitionManager, backendExporter)
            val bookManager = BookManager(repo, bookKit, illustManager, backendExporter)
            val associateManager = AssociateManager(repo)

            val folderKit = FolderKit(repo)
            val folderManager = FolderManager(repo, folderKit, illustManager)

            val illustExtendManager = IllustExtendManager(repo, illustKit, illustManager, associateManager, bookManager, folderManager, partitionManager, fileManager, backendExporter)

            val illustService = IllustService(repo, illustKit, illustManager, illustExtendManager, associateManager, sourceManager, partitionManager, queryManager, backendExporter)
            val bookService = BookService(repo, bookKit, bookManager, illustManager, queryManager, backendExporter)
            val folderService = FolderService(repo, folderKit, illustManager)
            val partitionService = PartitionService(repo)
            val annotationService = AnnotationService(repo, annotationKit, queryManager)
            val tagService = TagService(repo, tagKit, queryManager, sourceMappingManager, backendExporter)
            val authorService = AuthorService(repo, authorKit, queryManager, sourceMappingManager, backendExporter)
            val topicService = TopicService(repo, topicKit, queryManager, sourceMappingManager, backendExporter)
            val importService = ImportService(repo, fileManager, importManager, illustManager, sourceManager, importMetaManager, similarFinder)
            val findSimilarService = FindSimilarService(repo, illustExtendManager, similarFinder)

            val illustUtilService = IllustUtilService(repo)
            val pickerUtilService = PickerUtilService(repo, historyRecordManager)

            val settingAppdataService = SettingAppdataService(appdata)
            val settingMetaService = SettingMetaService(repo)
            val settingQueryService = SettingQueryService(repo)
            val settingImportService = SettingImportService(repo)
            val settingSiteService = SettingSourceService(repo)
            val settingFindSimilarService = SettingFindSimilarService(repo)

            AllServices(
                illustService,
                bookService,
                folderService,
                partitionService,
                importService,
                tagService,
                annotationService,
                authorService,
                topicService,
                sourceDataService,
                sourceMappingService,
                settingAppdataService,
                settingMetaService,
                settingQueryService,
                settingImportService,
                settingSiteService,
                settingFindSimilarService,
                queryService,
                findSimilarService,
                metaService,
                illustUtilService,
                pickerUtilService
            )
        }

        define { HttpServerImpl(health, lifetime, appStatus, appdata, services, serverOptions) }
    }
}