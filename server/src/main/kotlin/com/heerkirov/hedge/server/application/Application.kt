package com.heerkirov.hedge.server.application

import com.heerkirov.hedge.server.components.appdata.AppDataManagerImpl
import com.heerkirov.hedge.server.components.backend.FileGeneratorImpl
import com.heerkirov.hedge.server.components.backend.ImportProcessorImpl
import com.heerkirov.hedge.server.components.backend.TrashCleanerImpl
import com.heerkirov.hedge.server.components.backend.exporter.BackendExporterImpl
import com.heerkirov.hedge.server.components.backend.similar.SimilarFinderImpl
import com.heerkirov.hedge.server.components.backend.watcher.PathWatcherImpl
import com.heerkirov.hedge.server.components.bus.EventBusImpl
import com.heerkirov.hedge.server.components.compositor.EventCompositorImpl
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
        val bus = define { EventBusImpl() }
        val health = define { HealthImpl(options.channelPath) }
        val lifetime = define { LifetimeImpl(context, lifetimeOptions) }
        val appStatus = define { AppStatusDriverImpl(context, bus, options.channelPath) }
        val appdata = define { AppDataManagerImpl(options.channelPath) }
        val repo = define { DataRepositoryImpl(options.channelPath) }

        val services = define {
            define { ImportProcessorImpl(repo, bus) }
            val queryManager = QueryManager(repo, bus)
            val queryService = QueryService(queryManager)

            val sourceTagManager = SourceTagManager(repo, bus)
            val sourceBookManager = SourceBookManager(repo, bus)
            val sourceManager = SourceDataManager(repo, bus, sourceTagManager, sourceBookManager)
            val sourceMappingManager = SourceMappingManager(repo, bus, sourceTagManager)
            val sourceMarkService = SourceMarkService(repo)
            val sourceDataService = SourceDataService(repo, sourceManager, queryManager)
            val sourceMappingService = SourceMappingService(repo, sourceMappingManager)

            val similarFinder = define { SimilarFinderImpl(appStatus, repo, bus) }

            val fileGenerator = define { FileGeneratorImpl(appStatus, appdata, repo, bus) }
            val fileManager = FileManager(appdata, repo)
            val importMetaManager = ImportMetaManager(repo)
            val importManager = ImportManager(repo, bus, sourceManager, importMetaManager, fileManager, fileGenerator)

            val pathWatcher = define { PathWatcherImpl(appStatus, repo, bus, importManager) }

            val annotationKit = AnnotationKit(repo)
            val annotationManager = AnnotationManager(repo)

            val historyRecordManager = HistoryRecordManager(repo)
            val authorKit = AuthorKit(repo, annotationManager)
            val topicKit = TopicKit(repo, annotationManager)
            val tagKit = TagKit(repo, annotationManager)
            val metaUtilKit = MetaUtilKit(repo)
            val metaManager = MetaManager(repo)

            val illustKit = IllustKit(repo, metaManager)
            val bookKit = BookKit(repo, metaManager)
            val folderKit = FolderKit(repo)
            val backendExporter = define { BackendExporterImpl(appStatus, bus, repo, illustKit, bookKit) }
            val partitionManager = PartitionManager(repo)
            val associateManager = AssociateManager(repo)
            val stagingPostManager = StagingPostManager(repo, bus)
            val bookManager = BookManager(repo, bus, bookKit)
            val folderManager = FolderManager(repo, bus, folderKit)
            val trashManager = TrashManager(repo, bus, backendExporter, illustKit, fileManager, bookManager, folderManager, associateManager, partitionManager, sourceManager)
            val illustManager = IllustManager(repo, bus, illustKit, sourceManager, associateManager, bookManager, folderManager, partitionManager, trashManager)

            define { TrashCleanerImpl(appStatus, repo, trashManager) }
            define { EventCompositorImpl(repo, bus, backendExporter) }

            val homepageService = HomepageService(repo, stagingPostManager)
            val illustService = IllustService(repo, bus, illustKit, illustManager, associateManager, sourceManager, partitionManager, queryManager)
            val bookService = BookService(repo, bus, bookKit, bookManager, illustManager, queryManager)
            val folderService = FolderService(repo, bus, folderKit, folderManager, illustManager)
            val partitionService = PartitionService(repo, queryManager)
            val annotationService = AnnotationService(repo, bus, annotationKit, queryManager)
            val tagService = TagService(repo, bus, tagKit, sourceMappingManager)
            val authorService = AuthorService(repo, bus, authorKit, queryManager, sourceMappingManager)
            val topicService = TopicService(repo, bus, topicKit, queryManager, sourceMappingManager)
            val importService = ImportService(repo, bus, importManager, illustManager, bookManager, folderManager, importMetaManager, sourceManager, similarFinder, pathWatcher)
            val stagingPostService = StagingPostService(illustManager, stagingPostManager)
            val trashService = TrashService(repo, trashManager)

            val findSimilarService = FindSimilarService(repo, bus, similarFinder, illustManager, importManager, bookManager)
            val metaUtilService = MetaUtilService(repo, metaUtilKit, metaManager, historyRecordManager)
            val pickerUtilService = PickerUtilService(repo, historyRecordManager)
            val illustUtilService = IllustUtilService(repo)
            val exportUtilService = ExportUtilService(appdata, repo)

            val settingService = SettingService(appdata, repo, bus)

            AllServices(
                homepageService,
                illustService,
                bookService,
                folderService,
                partitionService,
                importService,
                stagingPostService,
                trashService,
                tagService,
                annotationService,
                authorService,
                topicService,
                sourceDataService,
                sourceMappingService,
                sourceMarkService,
                settingService,
                queryService,
                findSimilarService,
                exportUtilService,
                metaUtilService,
                illustUtilService,
                pickerUtilService
            )
        }

        define { HttpServerImpl(health, lifetime, appStatus, appdata, bus, services, serverOptions) }
    }
}