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
import io.javalin.config.JavalinConfig
import io.javalin.json.JavalinJackson
import io.javalin.plugin.bundled.CorsPlugin
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
        server = Javalin
            .create {
                it.showJavalinBanner = false
                it.http.maxRequestSize = 1024 * 1024 * 64 //最大64MB的request body限制
                it.jetty.modifyWebSocketServletFactory { ws ->
                    ws.idleTimeout = Duration.ofSeconds(60)
                }
                it.registerPlugin(CorsPlugin { plugin ->
                    plugin.addRule { rule ->
                        rule.anyHost()
                        rule.allowCredentials = true
                    }
                })
                it.jsonMapper(JavalinJackson(Json.objectMapper()))
                it.handle(
                    AppRoutes(lifetime, appStatus, appdata),
                    ServiceRoutes(allServices.service),
                    SettingRoutes(allServices.setting),
                    HomepageRoutes(allServices.homepage),
                    NoteRoutes(allServices.note),
                    UtilQueryRoutes(allServices.queryService),
                    UtilMetaRoutes(allServices.metaUtil),
                    UtilIllustRoutes(allServices.illustUtil),
                    UtilPickerRoutes(allServices.pickerUtil),
                    UtilExportRoutes(allServices.exportUtil),
                    UtilFileRoutes(allServices.fileUtil),
                    FindSimilarRoutes(allServices.findSimilar),
                    IllustRoutes(allServices.illust),
                    BookRoutes(allServices.book),
                    FolderRoutes(allServices.folder),
                    ImportRoutes(allServices.import),
                    StagingPostRoutes(allServices.stagingPost),
                    TrashRoutes(allServices.trash),
                    MetaTagRoutes(allServices.tag),
                    MetaTopicRoutes(allServices.topic),
                    MetaAuthorRoutes(allServices.author),
                    MetaAnnotationRoutes(allServices.annotation),
                    SourceRoutes(allServices.sourceData, allServices.sourceMapping)
                )
            }
            .handle(
                Aspect(appStatus),
                Authentication(token, appdata),
                StaticFileHandler(archive),
                ErrorHandler(),
                WsRoutes(lifetime, eventBus)
            )
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

private fun JavalinConfig.handle(vararg endpoints: Routes): JavalinConfig {
    for (endpoint in endpoints) {
        endpoint.handle(this)
    }
    return this
}

private fun Javalin.handle(vararg endpoints: Modules): Javalin {
    for (endpoint in endpoints) {
        endpoint.handle(this)
    }
    return this
}

interface Routes {
    fun handle(javalin: JavalinConfig)
}

interface Modules {
    fun handle(javalin: Javalin)
}

