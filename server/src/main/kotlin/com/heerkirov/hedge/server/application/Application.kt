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
import com.heerkirov.hedge.server.components.lifetime.LifetimeImpl
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
    framework {
        val bus = define { EventBusImpl() }
        val health = define { HealthImpl(options.serverDir) }
        val lifetime = define { LifetimeImpl(options) }
        val appStatus = define { AppStatusDriverImpl(context, bus, options) }
        val appdata = define { AppDataManagerImpl(options) }
        val repo = define { DataRepositoryImpl(options.serverDir) }
        val file = define { FileManager(appdata, repo, bus) }

        val services = run {
            val taskCounter = TaskCounterModule(bus)
            val taskScheduler = define { TaskSchedulerModule(appStatus, appdata, bus, options) }

            val sourceAnalyzeManager = SourceAnalyzeManager(appdata)
            val sourceTagManager = SourceTagManager(appdata, repo, bus)
            val sourceBookManager = SourceBookManager(repo, bus)
            val sourceManager = SourceDataManager(appdata, repo, bus, sourceTagManager, sourceBookManager)
            val sourceMappingManager = SourceMappingManager(appdata, repo, bus, sourceTagManager)
            val importManager = ImportManager(appdata, repo, bus, file)

            val similarFinder = define { SimilarFinderImpl(appStatus, appdata, repo, bus, taskCounter) }

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
            val backendExporter = define { BackendExporterImpl(appStatus, bus, taskCounter, repo, illustKit, bookKit) }
            val associateManager = AssociateManager(repo)
            val stagingPostManager = StagingPostManager(repo, bus)
            val bookManager = BookManager(repo, bus, bookKit)
            val folderManager = FolderManager(repo, bus, folderKit)
            val trashManager = TrashManager(repo, bus, backendExporter, illustKit, file, bookManager, folderManager, associateManager, sourceManager)
            val illustManager = IllustManager(appdata, repo, bus, illustKit, file, sourceManager, sourceMappingManager, associateManager, bookManager, folderManager, importManager, trashManager)
            val historyRecordManager = HistoryRecordManager(repo)
            val queryManager = QueryManager(appdata, repo, bus)

            define { EventCompositorImpl(repo, bus, backendExporter) }
            define { FileGeneratorImpl(appStatus, appdata, repo, bus, taskCounter, taskScheduler, trashManager) }
            define { DailyProcessorImpl(appdata, repo, bus, taskScheduler) }
            define { ImportProcessorImpl(appdata, repo, bus, taskScheduler, similarFinder, illustManager, sourceAnalyzeManager, sourceManager, sourceMappingManager) }

            AllServices(
                homepage = HomepageService(appdata, repo, stagingPostManager, taskCounter),
                illust = IllustService(appdata, repo, bus, illustKit, illustManager, associateManager, sourceManager, queryManager),
                book = BookService(appdata, repo, bus, bookKit, bookManager, illustManager, queryManager),
                folder = FolderService(repo, bus, folderKit, folderManager, illustManager),
                annotation = AnnotationService(repo, bus, annotationKit, queryManager),
                tag = TagService(repo, bus, tagKit, sourceMappingManager),
                author = AuthorService(appdata, repo, bus, authorKit, queryManager, sourceMappingManager),
                topic = TopicService(appdata, repo, bus, topicKit, queryManager, sourceMappingManager),
                import = ImportService(appdata, repo, bus, file, illustManager, importManager, sourceAnalyzeManager, sourceManager),
                stagingPost = StagingPostService(illustManager, stagingPostManager),
                trash = TrashService(appdata, repo, trashManager),
                sourceData = SourceDataService(appdata, repo, sourceManager, sourceAnalyzeManager, queryManager),
                sourceMapping = SourceMappingService(repo, sourceMappingManager),
                note = NoteService(repo, bus),
                query = QueryService(repo, queryManager, historyRecordManager),
                findSimilar = FindSimilarService(repo, bus, similarFinder, illustManager, bookManager),
                metaUtil = MetaUtilService(appdata, repo, metaUtilKit, metaManager, historyRecordManager),
                pickerUtil = PickerUtilService(appdata, repo, historyRecordManager),
                illustUtil = IllustUtilService(appdata, repo, illustManager),
                exportUtil = ExportUtilService(repo, file),
                fileUtil = FileUtilService(repo, file, bus),
                setting = SettingService(appdata, repo, bus)
            )
        }

        define { HttpServerImpl(health, lifetime, appStatus, appdata, file, bus, services, options) }
    }
}