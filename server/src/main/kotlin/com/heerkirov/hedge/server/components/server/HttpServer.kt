package com.heerkirov.hedge.server.components.server

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.health.Health
import com.heerkirov.hedge.server.components.server.modules.*
import com.heerkirov.hedge.server.components.server.routes.*
import com.heerkirov.hedge.server.components.lifetime.Lifetime
import com.heerkirov.hedge.server.components.status.AppStatusDriver
import com.heerkirov.hedge.server.enums.AppLoadStatus
import com.heerkirov.hedge.server.functions.manager.FileManager
import com.heerkirov.hedge.server.library.framework.Component
import com.heerkirov.hedge.server.utils.Json
import com.heerkirov.hedge.server.utils.Net
import com.heerkirov.hedge.server.utils.Token
import io.javalin.Javalin
import io.javalin.json.JavalinJackson
import java.net.BindException
import java.time.Duration

interface HttpServer : Component {
    /**
     * 启动HTTP server。
     */
    override fun load()
}

class HttpServerOptions(
    /**
     * 开发模式下强制使用此token。
     */
    val forceToken: String? = null,
    /**
     * 开发模式下强制使用此端口。
     */
    val forcePort: Int? = null,
    /**
     * 当用户没有在配置中指定端口时，从此端口开始迭代。
     */
    val defaultPort: Int = 9000
)

class HttpServerImpl(private val health: Health,
                     private val lifetime: Lifetime,
                     private val appStatus: AppStatusDriver,
                     private val appdata: AppDataManager,
                     private val archive: FileManager,
                     private val eventBus: EventBus,
                     private val allServices: AllServices,
                     private val options: HttpServerOptions) : HttpServer {
    private val token: String = options.forceToken ?: Token.token()
    private var port: Int? = null

    private var server: Javalin? = null

    override fun load() {
        val aspect = Aspect(appStatus)
        val authentication = Authentication(token)
        val staticFileHandler = StaticFileHandler(archive)
        val errorHandler = ErrorHandler()

        server = Javalin
            .create {
                it.showJavalinBanner = false
                it.http.maxRequestSize = 1024 * 1024 * 64 //最大64MB的request body限制
                it.jetty.wsFactoryConfig { ws ->
                    ws.idleTimeout = Duration.ofSeconds(60)
                }
                it.plugins.enableCors { cors ->
                    cors.add { config ->
                        config.anyHost()
                        config.allowCredentials = true
                    }
                }
                it.jsonMapper(JavalinJackson(Json.objectMapper()))
            }
            .handle(aspect, authentication, staticFileHandler, errorHandler)
            .handle(WsRoutes(lifetime, eventBus))
            .handle(AppRoutes(lifetime, appStatus, appdata))
            .handle(ServiceRoutes(allServices.service))
            .handle(SettingRoutes(allServices.setting))
            .handle(HomepageRoutes(allServices.homepage))
            .handle(UtilQueryRoutes(allServices.queryService))
            .handle(UtilMetaRoutes(allServices.metaUtil))
            .handle(UtilIllustRoutes(allServices.illustUtil))
            .handle(UtilPickerRoutes(allServices.pickerUtil))
            .handle(UtilExportRoutes(allServices.exportUtil))
            .handle(FindSimilarRoutes(allServices.findSimilar))
            .handle(IllustRoutes(allServices.illust))
            .handle(BookRoutes(allServices.book))
            .handle(FolderRoutes(allServices.folder))
            .handle(PartitionRoutes(allServices.partition))
            .handle(ImportRoutes(allServices.import))
            .handle(StagingPostRoutes(allServices.stagingPost))
            .handle(TrashRoutes(allServices.trash))
            .handle(MetaTagRoutes(allServices.tag))
            .handle(MetaTopicRoutes(allServices.topic))
            .handle(MetaAuthorRoutes(allServices.author))
            .handle(MetaAnnotationRoutes(allServices.annotation))
            .handle(SourceRoutes(allServices.sourceData, allServices.sourceMark, allServices.sourceMapping))
            .bind()
    }

    override fun close() {
        server?.stop()
    }


    /**
     * 进行绑定试探。将server绑定到端口，启动http服务。
     * @throws BindException 如果所有的端口绑定都失败，那么抛出异常，告知framework发生了致命错误。
     */
    private fun Javalin.bind(): Javalin {
        val port = getPorts().firstOrNull { Net.isPortAvailable(it) } ?: throw BindException("Server starting failed because no port is available.")
        try {
            this.start(port)
            this@HttpServerImpl.port = port
            health.save(port = port, token = token)
            return this
        }catch (e: BindException) {
            throw BindException("Binding port $port failed: ${e.message}")
        }
    }

    private fun getPorts(): List<Int> {
        return if(options.forcePort != null) {
            listOf(options.forcePort)
        }else if(appStatus.status == AppLoadStatus.READY && appdata.setting.server.port != null) {
            Net.analyzePort(appdata.setting.server.port!!)
        }else{
            Net.generatePort(options.defaultPort)
        }
    }
}

private fun Javalin.handle(vararg endpoints: Routes): Javalin {
    for (endpoint in endpoints) {
        endpoint.handle(this)
    }
    return this
}

interface Routes {
    fun handle(javalin: Javalin)
}

