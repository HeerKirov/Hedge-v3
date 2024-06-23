package com.heerkirov.hedge.server.application

import com.heerkirov.hedge.server.components.appdata.AppDataManagerImpl
import com.heerkirov.hedge.server.components.backend.*
import com.heerkirov.hedge.server.components.backend.exporter.BackendExporterImpl
import com.heerkirov.hedge.server.components.backend.similar.SimilarFinderImpl
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
            val backgroundTaskBus = BackgroundTaskBus(bus)
            val similarFinder = define { SimilarFinderImpl(appStatus, appdata, repo, bus, backgroundTaskBus) }

            val historyRecordManager = HistoryRecordManager(repo)
            val queryManager = QueryManager(appdata, repo, bus)
            val queryService = QueryService(repo, queryManager, historyRecordManager)

            val sourceAnalyzeManager = SourceAnalyzeManager(appdata)
            val sourceTagManager = SourceTagManager(appdata, repo, bus)
            val sourceBookManager = SourceBookManager(repo, bus)
            val sourceManager = SourceDataManager(appdata, repo, bus, sourceTagManager, sourceBookManager)
            val sourceMappingManager = SourceMappingManager(appdata, repo, bus, sourceTagManager)
            val sourceDataService = SourceDataService(appdata, repo, sourceManager, sourceAnalyzeManager, queryManager)
            val sourceMappingService = SourceMappingService(repo, sourceMappingManager)

            val importManager = ImportManager(appdata, repo, bus, file)

            val pathWatcher = define { PathWatcherImpl(appStatus, appdata, bus, importManager) }

            val annotationKit = AnnotationKit(repo)
            val annotationManager = AnnotationManager(repo)

            val authorKit = AuthorKit(repo, annotationManager)
            val topicKit = TopicKit(repo, annotationManager)
            val tagKit = TagKit(repo, annotationManager)
            val metaUtilKit = MetaUtilKit(appdata, repo)
            val metaManager = MetaManager(repo)

            val illustKit = IllustKit(appdata, repo, metaManager)
            val bookKit = BookKit(repo, metaManager)
            val folderKit = FolderKit(repo)
            val backendExporter = define { BackendExporterImpl(appStatus, bus, backgroundTaskBus, repo, illustKit, bookKit) }
            val associateManager = AssociateManager(repo)
            val stagingPostManager = StagingPostManager(repo, bus)
            val bookManager = BookManager(repo, bus, bookKit)
            val folderManager = FolderManager(repo, bus, folderKit)
            val trashManager = TrashManager(repo, bus, backendExporter, illustKit, file, bookManager, folderManager, associateManager, sourceManager)
            val illustManager = IllustManager(appdata, repo, bus, illustKit, file, sourceManager, sourceMappingManager, associateManager, bookManager, folderManager, importManager, trashManager)

            define { EventCompositorImpl(repo, bus, backendExporter) }
            define { FileGeneratorImpl(appStatus, appdata, repo, bus, backgroundTaskBus, trashManager) }
            define { DailyProcessorImpl(appStatus, appdata, repo, bus) }
            define { ImportProcessorImpl(appStatus, appdata, repo, bus, similarFinder, illustManager, sourceAnalyzeManager, sourceManager, sourceMappingManager) }

            val homepageService = HomepageService(appdata, repo, stagingPostManager, backgroundTaskBus)
            val illustService = IllustService(appdata, repo, bus, illustKit, illustManager, associateManager, sourceManager, queryManager)
            val bookService = BookService(appdata, repo, bus, bookKit, bookManager, illustManager, queryManager)
            val folderService = FolderService(repo, bus, folderKit, folderManager, illustManager)
            val annotationService = AnnotationService(repo, bus, annotationKit, queryManager)
            val tagService = TagService(repo, bus, tagKit, sourceMappingManager)
            val authorService = AuthorService(appdata, repo, bus, authorKit, queryManager, sourceMappingManager)
            val topicService = TopicService(appdata, repo, bus, topicKit, queryManager, sourceMappingManager)
            val importService = ImportService(appdata, repo, bus, file, illustManager, importManager, sourceAnalyzeManager, sourceManager, pathWatcher)
            val stagingPostService = StagingPostService(illustManager, stagingPostManager)
            val trashService = TrashService(appdata, repo, trashManager)

            val findSimilarService = FindSimilarService(repo, bus, similarFinder, illustManager, bookManager)
            val metaUtilService = MetaUtilService(appdata, repo, metaUtilKit, metaManager, historyRecordManager)
            val pickerUtilService = PickerUtilService(appdata, repo, historyRecordManager)
            val illustUtilService = IllustUtilService(appdata, repo, illustManager)
            val exportUtilService = ExportUtilService(repo, file)
            val fileUtilService = FileUtilService(repo, file, bus)

            val noteService = NoteService(repo, bus)
            val serviceService = ServiceService(appdata)
            val settingService = SettingService(appdata, repo, bus)

            AllServices(
                homepageService,
                illustService,
                bookService,
                folderService,
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
                pickerUtilService,
                fileUtilService
            )
        }

        define { HttpServerImpl(health, lifetime, appStatus, appdata, file, bus, services, serverOptions) }
    }
}