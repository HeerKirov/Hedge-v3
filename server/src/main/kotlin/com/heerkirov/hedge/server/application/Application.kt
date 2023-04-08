package com.heerkirov.hedge.server.application

import com.heerkirov.hedge.server.components.appdata.AppDataManagerImpl
import com.heerkirov.hedge.server.components.backend.FileGeneratorImpl
import com.heerkirov.hedge.server.components.backend.exporter.BackendExporterImpl
import com.heerkirov.hedge.server.components.backend.similar.SimilarFinderImpl
import com.heerkirov.hedge.server.components.backend.watcher.PathWatcherImpl
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
        val bus = define { EventBusImpl(context) }
        val health = define { HealthImpl(options.channelPath) }
        val lifetime = define { LifetimeImpl(context, lifetimeOptions) }
        val appStatus = define { AppStatusDriverImpl(context, bus, options.channelPath) }
        val appdata = define { AppDataManagerImpl(options.channelPath) }
        val repo = define { DataRepositoryImpl(options.channelPath) }

        val services = define {
            val queryManager = QueryManager(repo, bus)
            val queryService = QueryService(queryManager)

            val sourceTagManager = SourceTagManager(repo, bus)
            val sourceBookManager = SourceBookManager(repo, bus)
            val sourceManager = SourceDataManager(repo, bus, sourceTagManager, sourceBookManager)
            val sourceMappingManager = SourceMappingManager(repo, bus, sourceTagManager)
            val sourceDataService = SourceDataService(repo, sourceManager, queryManager)
            val sourceMappingService = SourceMappingService(repo, sourceMappingManager)

            val similarFinder = define { SimilarFinderImpl(appStatus, repo, bus) }

            val thumbnailGenerator = define { FileGeneratorImpl(appStatus, appdata, repo, bus) }
            val fileManager = FileManager(appdata, repo)
            val importMetaManager = ImportMetaManager(repo)
            val importManager = ImportManager(repo, bus, importMetaManager, fileManager, thumbnailGenerator)
            val pathWatcher = define { PathWatcherImpl(appStatus, repo, bus, importManager) }

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
            val backendExporter = define { BackendExporterImpl(appStatus, bus, repo, illustKit, bookKit) }
            val illustManager = IllustManager(repo, bus, illustKit, sourceManager, partitionManager, backendExporter)
            val bookManager = BookManager(repo, bus, bookKit, illustManager, backendExporter)
            val associateManager = AssociateManager(repo)

            val folderKit = FolderKit(repo)
            val folderManager = FolderManager(repo, bus, folderKit)

            val illustExtendManager = IllustExtendManager(repo, bus, illustKit, illustManager, associateManager, bookManager, folderManager, partitionManager, fileManager, backendExporter)

            val illustService = IllustService(repo, bus, illustKit, illustManager, illustExtendManager, associateManager, sourceManager, partitionManager, queryManager, backendExporter)
            val bookService = BookService(repo, bus, bookKit, bookManager, illustManager, queryManager, backendExporter)
            val folderService = FolderService(repo, bus, folderKit, folderManager, illustManager)
            val partitionService = PartitionService(repo, queryManager)
            val annotationService = AnnotationService(repo, bus, annotationKit, queryManager)
            val tagService = TagService(repo, bus, tagKit, sourceMappingManager, backendExporter)
            val authorService = AuthorService(repo, bus, authorKit, queryManager, sourceMappingManager, backendExporter)
            val topicService = TopicService(repo, bus, topicKit, queryManager, sourceMappingManager, backendExporter)
            val importService = ImportService(repo, bus, fileManager, importManager, illustManager, illustExtendManager, bookManager, folderManager, sourceManager, importMetaManager, similarFinder, pathWatcher)
            val findSimilarService = FindSimilarService(repo, illustExtendManager, similarFinder)

            val illustUtilService = IllustUtilService(repo)
            val pickerUtilService = PickerUtilService(repo, historyRecordManager)

            val settingAppdataService = SettingAppdataService(appdata, bus)
            val settingMetaService = SettingMetaService(repo, bus)
            val settingQueryService = SettingQueryService(repo, bus)
            val settingImportService = SettingImportService(repo, bus)
            val settingSiteService = SettingSourceService(repo, bus)
            val settingFindSimilarService = SettingFindSimilarService(repo, bus)

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

        define { HttpServerImpl(health, lifetime, appStatus, appdata, bus, services, serverOptions) }
    }
}