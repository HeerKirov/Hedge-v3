package com.heerkirov.hedge.server.components.http.modules

import com.heerkirov.hedge.server.enums.ArchiveType
import com.heerkirov.hedge.server.components.http.Routes
import com.heerkirov.hedge.server.functions.manager.FileManager
import io.javalin.Javalin
import io.javalin.http.Context
import io.javalin.http.HttpCode
import org.eclipse.jetty.server.handler.ResourceHandler

class StaticFileHandler(private val archive: FileManager) : Routes {
    private val prefix = "/archives"
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
        val target = ctx.path().removePrefix(prefix).trimStart('/')
        val splits = target.split("/", limit = 3)
        if(splits.size < 3) {
            ctx.status(HttpCode.NOT_FOUND)
            return
        }

        val archiveType = try {
            ArchiveType.valueOf(splits[0].uppercase())
        }catch (e: IllegalArgumentException) {
            ctx.status(HttpCode.NOT_FOUND)
            return
        }

        val path = archive.load(archiveType, splits[1], splits[2])
        if(path == null) {
            ctx.status(HttpCode.NOT_FOUND)
            return
        }

        val resource = resourceHandler.getResource(path.toString())

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