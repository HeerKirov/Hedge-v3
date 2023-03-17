package com.heerkirov.hedge.server.components.http.modules

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.http.Routes
import io.javalin.Javalin
import io.javalin.http.Context
import io.javalin.http.HttpCode
import org.eclipse.jetty.server.handler.ResourceHandler
import kotlin.io.path.Path
import kotlin.io.path.absolutePathString

class StaticFileHandler(private val appdata: AppDataManager) : Routes {
    private val prefix = "/folders"
    private val resourceHandler = ResourceHandler()

    init {
        resourceHandler.resourceBase = "/"
        resourceHandler.isDirAllowed = false
        resourceHandler.isEtags = true
        resourceHandler.start()
    }

    override fun handle(javalin: Javalin) {
        javalin.get("$prefix/*", ::handle)
    }

    private fun handle(ctx: Context) {
        val target = ctx.path().removePrefix(prefix)

        val pathString = Path(appdata.storagePathAccessor.storageDir, target).absolutePathString()
        val resource = resourceHandler.getResource(pathString)

        if(resource != null && resource.exists() && !resource.isDirectory) {
            val contentType = when(resource.file.extension) {
                "jpeg", "jpg" -> "image/jpeg"
                "png" -> "image/png"
                "gif" -> "image/gif"
                "mp4" -> "video/mp4"
                "webm" -> "video/webm"
                else -> "application/octet-stream"
            }
            ctx.seekableStream(resource.inputStream, contentType)
        }else{
            ctx.status(HttpCode.NOT_FOUND)
        }
    }
}