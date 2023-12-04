package com.heerkirov.hedge.server.application

import com.heerkirov.hedge.server.components.appdata.AppDataManagerImpl
import com.heerkirov.hedge.server.components.backend.FileGeneratorImpl
import com.heerkirov.hedge.server.components.backend.ImportProcessorImpl
import com.heerkirov.hedge.server.components.backend.DailyProcessorImpl
import com.heerkirov.hedge.server.components.backend.exporter.BackendExporterImpl
import com.heerkirov.hedge.server.components.backend.similar.SimilarFinderImpl
import com.heerkirov.hedge.server.components.backend.watcher.PathWatcherImpl
import com.heerkirov.hedge.server.components.bus.EventBusImpl
import com.heerkirov.hedge.server.components.bus.EventCompositorImpl
import com.heerkirov.hedge.server.components.database.DataRepositoryImpl
import com.heerkirov.hedge.server.components.health.HealthImpl
import com.heerkirov.hedge.server.components.server.HttpServerImpl
import com.heerkirov.hedge.server.components.server.HttpServerOptions
import com.heerkirov.hedge.server.components.lifetime.LifetimeImpl
import com.heerkirov.hedge.server.components.lifetime.LifetimeOptions
import com.heerkirov.hedge.server.components.server.AllServices
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
        val file = define { FileManager(appdata, repo, bus) }

        val services = define {
            val similarFinder = define { SimilarFinderImpl(appStatus, appdata, repo, bus) }

            val queryManager = QueryManager(appdata, repo, bus)
            val queryService = QueryService(queryManager)

            val sourceTagManager = SourceTagManager(appdata, repo, bus)
            val sourceBookManager = SourceBookManager(repo, bus)
            val sourceManager = SourceDataManager(appdata, repo, bus, sourceTagManager, sourceBookManager)
            val sourceMappingManager = SourceMappingManager(appdata, repo, bus, sourceTagManager)
            val sourceDataService = SourceDataService(appdata, repo, sourceManager, queryManager)
            val sourceMappingService = SourceMappingService(repo, sourceMappingManager)

            val importMetaManager = ImportMetaManager(appdata)
            val importManager = ImportManager(repo, bus, file)

            val pathWatcher = define { PathWatcherImpl(appStatus, appdata, bus, importManager) }

            val annotationKit = AnnotationKit(repo)
            val annotationManager = AnnotationManager(repo)

            val historyRecordManager = HistoryRecordManager(repo)
            val authorKit = AuthorKit(repo, annotationManager)
            val topicKit = TopicKit(repo, annotationManager)
            val tagKit = TagKit(repo, annotationManager)
            val metaUtilKit = MetaUtilKit(appdata, repo)
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
            val trashManager = TrashManager(repo, bus, backendExporter, illustKit, file, bookManager, folderManager, associateManager, partitionManager, sourceManager)
            val illustManager = IllustManager(appdata, repo, bus, illustKit, sourceManager, associateManager, bookManager, folderManager, partitionManager, importManager, trashManager)

            define { EventCompositorImpl(repo, bus, backendExporter) }
            define { FileGeneratorImpl(appStatus, appdata, repo, bus) }
            define { DailyProcessorImpl(appStatus, appdata, repo, bus, trashManager) }
            define { ImportProcessorImpl(appdata, repo, bus, similarFinder, illustManager, importMetaManager, sourceManager) }

            val homepageService = HomepageService(appdata, repo, stagingPostManager)
            val illustService = IllustService(appdata, repo, bus, illustKit, illustManager, associateManager, sourceManager, partitionManager, queryManager)
            val bookService = BookService(appdata, repo, bus, bookKit, bookManager, illustManager, queryManager)
            val folderService = FolderService(repo, bus, folderKit, folderManager, illustManager)
            val partitionService = PartitionService(repo, queryManager)
            val annotationService = AnnotationService(repo, bus, annotationKit, queryManager)
            val tagService = TagService(repo, bus, tagKit, sourceMappingManager)
            val authorService = AuthorService(appdata, repo, bus, authorKit, queryManager, sourceMappingManager)
            val topicService = TopicService(appdata, repo, bus, topicKit, queryManager, sourceMappingManager)
            val importService = ImportService(appdata, repo, bus, file, illustManager, importManager, importMetaManager, sourceManager, pathWatcher)
            val stagingPostService = StagingPostService(illustManager, stagingPostManager)
            val trashService = TrashService(appdata, repo, trashManager)

            val findSimilarService = FindSimilarService(repo, bus, similarFinder, illustManager, bookManager)
            val metaUtilService = MetaUtilService(appdata, repo, metaUtilKit, metaManager, historyRecordManager)
            val pickerUtilService = PickerUtilService(appdata, repo, historyRecordManager)
            val illustUtilService = IllustUtilService(repo)
            val exportUtilService = ExportUtilService(appdata, repo, file)

            val noteService = NoteService(repo, bus)
            val serviceService = ServiceService(appdata)
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
                serviceService,
                settingService,
                noteService,
                queryService,
                findSimilarService,
                exportUtilService,
                metaUtilService,
                illustUtilService,
                pickerUtilService
            )
        }

        define { HttpServerImpl(health, lifetime, appStatus, appdata, file, bus, services, serverOptions) }
    }
}