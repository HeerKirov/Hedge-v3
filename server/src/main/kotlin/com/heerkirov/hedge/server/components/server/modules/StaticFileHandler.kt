package com.heerkirov.hedge.server.components.server.modules

import com.heerkirov.hedge.server.application.ApplicationOptions
import com.heerkirov.hedge.server.components.server.Modules
import com.heerkirov.hedge.server.enums.ArchiveType
import com.heerkirov.hedge.server.exceptions.OnlyForLocal
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.manager.FileManager
import io.javalin.Javalin
import io.javalin.http.Context
import io.javalin.http.HttpStatus
import io.javalin.http.util.SeekableWriter
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import kotlin.io.path.Path
import kotlin.io.path.createDirectories

class StaticFileHandler(private val archive: FileManager, private val options: ApplicationOptions) : Modules {
    private val prefix = "/archives"
    private val prefixLocal = "/archives-for-local"

    private val httpClient = if(options.storageProxy != null) HttpClient.newHttpClient() else null

    init {
        SeekableWriter.chunkSize = 1000 * 1000 * 4
    }

    override fun handle(javalin: Javalin) {
        if(options.storageProxy != null) {
            javalin.get("$prefix/*", ::proxyHandle)
            javalin.get("$prefixLocal/*", ::proxyHandleLocal)
        }else{
            javalin.get("$prefix/*", ::handle)
            javalin.get("$prefixLocal/*", ::handleLocal)
        }
    }

    private fun handle(ctx: Context) {
        val target = ctx.path().removePrefix(prefix).trimStart('/')
        val splits = target.split("/", limit = 3)
        if(splits.size < 3) {
            ctx.status(HttpStatus.NOT_FOUND)
            return
        }

        val archiveType = try {
            ArchiveType.valueOf(splits[0].uppercase())
        }catch (e: IllegalArgumentException) {
            ctx.status(HttpStatus.NOT_FOUND)
            return
        }

        val resource = archive.readFile(archiveType, splits[1], splits[2])
        if(resource == null) {
            ctx.status(HttpStatus.NOT_FOUND)
            return
        }

        val contentType = when(resource.extension) {
            "jpeg", "jpg" -> "image/jpeg"
            "png" -> "image/png"
            "gif" -> "image/gif"
            "mp4" -> "video/mp4"
            "webm" -> "video/webm"
            else -> "application/octet-stream"
        }
        ctx.writeSeekableStream(resource.inputStream, contentType, resource.size)
    }

    private fun handleLocal(ctx: Context) {
        if(options.remoteMode) throw be(OnlyForLocal)

        val target = ctx.path().removePrefix(prefixLocal).trimStart('/')
        val splits = target.split("/", limit = 3)
        if(splits.size < 3) {
            ctx.status(HttpStatus.NOT_FOUND)
            return
        }

        val archiveType = try {
            ArchiveType.valueOf(splits[0].uppercase())
        }catch (e: IllegalArgumentException) {
            ctx.status(HttpStatus.NOT_FOUND)
            return
        }

        val resource = archive.readFile(archiveType, splits[1], splits[2])
        if(resource == null) {
            ctx.status(HttpStatus.NOT_FOUND)
            return
        }

        val dest = Path(options.serverDir, "../caches", target)
        dest.createDirectories()

        resource.inputStream.use { fis -> Files.copy(fis, dest, StandardCopyOption.REPLACE_EXISTING) }

        ctx.status(204)
    }

    private fun proxyHandle(ctx: Context) {
        ctx.redirect("${options.storageProxy}${ctx.path()}", HttpStatus.TEMPORARY_REDIRECT)
    }

    private fun proxyHandleLocal(ctx: Context) {
        if(options.remoteMode) throw be(OnlyForLocal)

        val target = ctx.path().removePrefix(prefixLocal).trimStart('/')
        val splits = target.split("/", limit = 3)
        if(splits.size < 3) {
            ctx.status(HttpStatus.NOT_FOUND)
            return
        }

        val request = HttpRequest.newBuilder()
            .uri(URI.create("${options.storageProxy}/archives/$target"))
            .build()

        val response = httpClient!!.send(request, HttpResponse.BodyHandlers.ofInputStream())
        if(response.statusCode() == 200) {
            response.body().use { input ->
                val dest = Path(options.serverDir, "../caches", target)
                dest.createDirectories()
                Files.copy(input, dest, StandardCopyOption.REPLACE_EXISTING)
            }
            ctx.status(204)
        }else{
            ctx.status(response.statusCode())
        }
    }
}