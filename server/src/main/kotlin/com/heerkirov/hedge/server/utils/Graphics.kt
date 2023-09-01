package com.heerkirov.hedge.server.utils

import com.heerkirov.hedge.server.exceptions.IllegalFileExtensionError
import com.heerkirov.hedge.server.exceptions.be
import ws.schild.jave.Encoder
import ws.schild.jave.MultimediaObject
import ws.schild.jave.ScreenExtractor
import ws.schild.jave.encode.AudioAttributes
import ws.schild.jave.encode.EncodingAttributes
import ws.schild.jave.encode.VideoAttributes
import java.awt.MediaTracker
import java.awt.RenderingHints
import java.awt.Toolkit
import java.awt.image.BufferedImage
import java.io.File
import java.io.FileOutputStream
import javax.imageio.IIOImage
import javax.imageio.ImageIO
import javax.imageio.ImageWriteParam
import javax.imageio.plugins.jpeg.JPEGImageWriteParam
import javax.swing.JPanel
import kotlin.math.sqrt

object Graphics {
    const val THUMBNAIL_RESIZE_AREA = 1200 * 1200
    const val SAMPLE_RESIZE_AREA = 400 * 400

    init {
        //在mac上，调用Graphics组件时，会生成一个愚蠢的dock栏进程。为了隐藏掉这个进程，需要设置此属性
        System.setProperty("apple.awt.UIElement", "true")
    }

    /**
     * 使用全局通用策略生成缩略图，并获得原始分辨率。
     * 全局策略中，非jpg类型的文件需要转换至jpg文件(视频需要截图)，尺寸超过一定面积的图片需要缩放至适合尺寸。
     * @return 缩略图文件的临时文件File。如果返回null，表示按照全局策略不需要生成缩略图。
     * @throws IllegalFileExtensionError 不支持的扩展名
     */
    fun process(src: File, resizeArea: Int): ProcessResult {
        val resolutionWidth: Int
        val resolutionHeight: Int
        var videoDuration: Long? = null
        //对于非jpg类型，将文件转换至jpg类型的snapshot
        val snapshot = when (src.extension.lowercase()) {
            "jpeg", "jpg" -> null
            "png", "gif" -> translateImageToJpg(src, quality = 0.9F)
            "mp4", "webm" -> {
                val media = MultimediaObject(src)
                videoDuration = media.info.duration.takeIf { it >= 0 }
                translateVideoToJpg(media, timePercent = 0.25F) //取25%进度位置的帧作为截图
            }
            else -> throw be(IllegalFileExtensionError(src.extension))
        }
        val resized = try {
            val file = snapshot ?: src
            val source = loadJpg(file)
            resolutionWidth = source.width
            resolutionHeight = source.height
            //当原始图像的面积超过RESIZE AREA时，对其缩放，保持比例收缩至小于此面积。
            if(resolutionWidth * resolutionHeight > resizeArea) {
                /* nw * nh = RA
                 * w * h = area
                 * nw / nh = w / h
                 * nw = w * nh / h
                 * nh^2 * w / h = RA
                 * nh = SQRT(RA * h / w) */
                val nh = sqrt(resizeArea.toDouble() * resolutionWidth / resolutionHeight)
                val nw = nh * resolutionWidth / resolutionHeight
                resize(source, file.extension, nw.toInt(), nh.toInt())
            }else{
                null
            }
        }catch (e: Throwable) {
            if(snapshot != null && snapshot.exists()) snapshot.delete()
            throw e
        }

        if(resized != null && snapshot != null && snapshot.exists()) snapshot.delete()
        //使用resized结果，没有resize就使用snapshot的结果。按照目前的策略，除了jpg格式，其他格式一定会生成snapshot，导致有缩略图。
        return ProcessResult(resized ?: snapshot, resolutionWidth, resolutionHeight, videoDuration)
    }

    /**
     * 用正确的方式加载一张JPEG图片，获得BufferedImage，用于后续的流程。
     * ImageIO对JPEG格式的处理存在大坑，"当没有JFIF信息时，文件会被错误地解释"，具体表现为完全错误的颜色。
     * 一句话概括的解决方案是用Toolkit.getImage而不是ImageIO.read来读。
     * 参考回答：
     * 最直观的问题呈现和解决代码: https://stackoverflow.com/questions/19659269/losing-colors-when-resizing-jpegs-in-java-tried-with-multiple-libraries
     * 上一条问题的答案来源: https://stackoverflow.com/questions/19654017/resizing-bufferedimages-and-storing-them-to-file-results-in-black-background-for/19654452#19654452
     * 另一条指出解决方案的问题: https://stackoverflow.com/questions/9340569/jpeg-image-with-wrong-colors
     */
    private fun loadJpg(file: File): BufferedImage {
        val image = Toolkit.getDefaultToolkit().getImage(file.absolutePath)
        try {
            //getImage方法是异步的，因此需要等待它加载完成
            MediaTracker(JPanel()).also { tracker ->
                tracker.addImage(image, 0)
                try {
                    tracker.waitForID(0)
                } catch (ex: InterruptedException) {
                    throw RuntimeException(ex)
                }
            }

            // if (image is BufferedImage) return image

            val bufferedImage = BufferedImage(image.getWidth(null), image.getHeight(null), BufferedImage.TYPE_INT_RGB)

            bufferedImage.graphics.drawImage(image, 0, 0, null)
            bufferedImage.graphics.dispose()

            return bufferedImage
        }finally {
            //ToolKit加载的Image会被缓存的SoftCache。虽然这是一个弱引用，但实际上还是引起了heap space OOM。
            //所以要尝试手动卸载缓存。
            //https://stackoverflow.com/questions/5245864/images-getting-cached-and-eating-up-my-heap-space
            image.flush()
        }
    }

    /**
     * 调整图像大小。
     * 仅支持jpeg/jpg/png格式。
     * @param format 输出格式。
     * @param targetWidth 固定缩放至此宽度。
     * @param targetHeight 固定缩放至此高度。
     */
    private fun resize(source: BufferedImage, format: String, targetWidth: Int, targetHeight: Int): File {
        val target = BufferedImage(targetWidth, targetHeight, source.type).apply {
            createGraphics().apply {
                try {
                    setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR)
                    drawImage(source, 0, 0, targetWidth, targetHeight, 0, 0, source.width, source.height, null)
                }finally {
                    dispose()
                }
            }
        }

        return Fs.temp(format).also { dest ->
            try {
                ImageIO.write(target, format, dest)
            }catch (e: Throwable) {
                if(dest.exists()) dest.delete()
                throw e
            }
        }
    }

    /**
     * 将一张png或gif格式的图片转换至jpg格式。Alpha通道会被填补颜色。GIF图像仅会截取第一帧，因此可用作缩略图。
     */
    private fun translateImageToJpg(src: File, quality: Float = 0.92F): File {
        val source = ImageIO.read(src).let {
            //这里同样也会受到PNG读取错误type=0的问题的影响，因此要在遇到这个问题时，主动做一次修改
            if(it.colorModel.hasAlpha() || it.type == 0) {
                //消除alpha的代码来自 https://stackoverflow.com/questions/60380175/how-to-resolve-javax-imageio-iioexception-bogus-input-colorspace
                BufferedImage(it.width, it.height, BufferedImage.TYPE_INT_RGB).apply {
                    createGraphics().apply {
                        try {
                            fillRect(0, 0, it.width, it.height)
                            drawImage(it, 0, 0, null)
                        }finally {
                            dispose()
                        }
                    }
                }
            }else{
                it
            }
        }

        return Fs.temp("jpg").also { dest ->
            try {
                val writer = ImageIO.getImageWritersByFormatName("jpg").next()
                try {
                    val param = JPEGImageWriteParam(null).apply {
                        //由于输出格式是jpeg，需要设置其质量。
                        //0.92~0.93之间的质量，将输出和原图差不多的大小。1的质量膨胀较大，如果从png转过来的，可参考使用。
                        compressionMode = ImageWriteParam.MODE_EXPLICIT
                        compressionQuality = quality
                    }
                    FileOutputStream(dest).use {
                        writer.output = ImageIO.createImageOutputStream(it)
                        writer.write(null, IIOImage(source, null, null), param)
                    }
                }finally{
                    writer.dispose()
                }
            }catch (e: Throwable) {
                if(dest.exists()) dest.delete()
                throw e
            }
        }
    }

    /**
     * 从mp4/webm格式的视频中提取关键帧并输出为图像。输出的格式固定为jpg。
     * @param timeMills 采用此时间点的帧。优先使用此参数，但如果影片长度长于此参数则不适用。
     * @param timePercent 使用一个[0, 1]的数值作为百分比值，从影片的此百分比进度处取帧。
     */
    private fun translateVideoToJpg(media: MultimediaObject, timeMills: Long? = null, timePercent: Float = 0F): File {
        val time = if(timeMills != null && timeMills < media.info.duration) timeMills else (media.info.duration * timePercent).toLong()

        return Fs.temp("jpg").also { dest ->
            try {
                ScreenExtractor().renderOneImage(media, -1, -1, time, dest, 1, true)
            }catch (e: Throwable) {
                if(dest.exists()) dest.delete()
                throw e
            }
        }
    }

    /**
     * 将webm格式的视频转换至mp4格式。采用AAC/H264编码。
     */
    private fun translateVideoToMp4(src: File): File {
        val media = MultimediaObject(src)
        val attrs = EncodingAttributes().apply {
            setAudioAttributes(AudioAttributes().apply {
                setCodec("aac")         //mp4格式可用的编码貌似更常见一些
                setBitRate(128000)      //参考码率128kHz
                setSamplingRate(if(media.info.audio.samplingRate > 0) media.info.audio.samplingRate else 44100) //参考采样率44.1kHz
                setChannels(if(media.info.audio.channels > 0) media.info.audio.channels else 2) //双声道
            })
            setVideoAttributes(VideoAttributes().apply {
                setCodec("h264")        //mp4格式可用的编码貌似更常见一些
                setBitRate(4000000)     //参考码率4mHz
                setFrameRate(if(media.info.video.frameRate > 0) media.info.video.frameRate.toInt() else 30) //参考帧率30
            })
            setOutputFormat("mp4")
        }
        return Fs.temp("mp4").also { dest ->
            try {
                Encoder().encode(MultimediaObject(src), dest, attrs)
            }catch (e: Throwable) {
                if(dest.exists()) dest.delete()
                throw e
            }
        }
    }

    data class ProcessResult(val thumbnailFile: File?, val resolutionWidth: Int, val resolutionHeight: Int, val videoDuration: Long?)
}