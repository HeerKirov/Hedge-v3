package com.heerkirov.hedge.server.utils

import com.heerkirov.hedge.server.exceptions.IllegalFileExtensionError
import com.heerkirov.hedge.server.exceptions.be
import net.coobird.thumbnailator.Thumbnails
import net.coobird.thumbnailator.filters.Canvas
import net.coobird.thumbnailator.geometry.Positions
import ws.schild.jave.MultimediaObject
import ws.schild.jave.ScreenExtractor
import java.awt.Color
import java.io.File
import java.io.IOException
import javax.imageio.ImageIO
import javax.imageio.stream.FileImageInputStream
import kotlin.math.sqrt

/**
 * - 已知问题: 极少数的PNG图像(如sankaku/6217893)可能造成Error reading PNG metadata: Invalid chunk length错误。
 *   暂未找到合适的解决方案，除非直接捕获IIOException，然后用ImageIO直接强转JPEG，将其当做例外处理
 *   猜测此问题覆盖面可能极窄，因此暂搁置该问题，仅在此记录。
 */
object NewGraphics {
    const val THUMBNAIL_RESIZE_AREA = 1200 * 1200
    const val SAMPLE_RESIZE_AREA = 400 * 400
    private val BACKGROUND_COLOR = Color(245, 245, 245)

    /**
     * 使用全局通用策略生成缩略图，并获得原始分辨率。
     * 全局策略中，非jpg类型的文件需要转换至jpg文件(视频需要截图)，尺寸超过一定面积的图片需要缩放至适合尺寸。
     * @return 缩略图文件的临时文件File。如果返回null，表示按照全局策略不需要生成缩略图。
     * @throws IllegalFileExtensionError 不支持的扩展名
     */
    fun process(src: File, resizeArea: Int): ProcessResult {
        return when (src.extension.lowercase()) {
            "jpeg", "jpg" -> {
                val (resolutionWidth, resolutionHeight) = getImageDimension(src)
                if(resolutionWidth * resolutionHeight > resizeArea) {
                    val source = Thumbnails.of(src)
                    val nh = sqrt(resizeArea.toDouble() * resolutionWidth / resolutionHeight)
                    val nw = nh * resolutionWidth / resolutionHeight
                    val output = Fs.temp("jpg")
                    try {
                        source.size(nw.toInt(), nh.toInt()).outputQuality(0.9).toFile(output)
                    }catch (e: Throwable) {
                        output.delete()
                        throw e
                    }
                    ProcessResult(output, resolutionWidth, resolutionHeight, null)
                }else{
                    ProcessResult(null, resolutionWidth, resolutionHeight, null)
                }
            }
            "png", "gif" -> {
                val (resolutionWidth, resolutionHeight) = getImageDimension(src)
                val source = Thumbnails.of(src).outputFormat("JPG")
                val output = Fs.temp("jpg")
                try {
                    if(resolutionWidth * resolutionHeight > resizeArea) {
                        val nh = sqrt(resizeArea.toDouble() * resolutionWidth / resolutionHeight)
                        val nw = nh * resolutionWidth / resolutionHeight
                        source.size(nw.toInt(), nh.toInt()).addFilter(Canvas(nw.toInt(), nh.toInt(), Positions.CENTER, BACKGROUND_COLOR))
                    }else{
                        source.size(resolutionWidth, resolutionHeight).addFilter(Canvas(resolutionWidth, resolutionHeight, Positions.CENTER, BACKGROUND_COLOR))
                    }
                    source.outputQuality(0.9).toFile(output)
                }catch (e: Throwable) {
                    output.delete()
                    throw e
                }
                ProcessResult(output, resolutionWidth, resolutionHeight, null)
            }
            "mp4", "webm" -> {
                val media = MultimediaObject(src)
                val videoDuration = media.info.duration.takeIf { it >= 0 }
                val resolutionWidth = media.info.video.size.width
                val resolutionHeight = media.info.video.size.height
                val time = (media.info.duration * 0.25).toLong()

                val output = Fs.temp("jpg")
                try {
                    if(resolutionWidth * resolutionHeight > resizeArea) {
                        val nh = sqrt(resizeArea.toDouble() * resolutionWidth / resolutionHeight)
                        val nw = nh * resolutionWidth / resolutionHeight
                        ScreenExtractor().renderOneImage(media, nw.toInt(), nh.toInt(), time, output, 1, true)
                    }else{
                        ScreenExtractor().renderOneImage(media, -1, -1, time, output, 1, true)
                    }
                }catch (e: Throwable) {
                    output.delete()
                    throw e
                }
                if(!output.exists()) {
                    throw RuntimeException("File $src render thumbnail failed. Final file not exist.")
                }

                ProcessResult(output, resolutionWidth, resolutionHeight, videoDuration)
            }
            else -> throw be(IllegalFileExtensionError(src.extension))
        }
    }

    /**
     * 获取图像的分辨率。直接ImageIO.read的操作太费时了。
     * 该算法来自 https://stackoverflow.com/questions/672916/how-to-get-image-height-and-width-using-java
     * 不过，该算法虽简洁通用，但还不能保证覆盖全部情况。当无法读取时，回退到ImageIO读取。
     */
    private fun getImageDimension(imgFile: File): Pair<Int, Int> {
        val suffix = imgFile.name.substringAfterLast('.')
        for (reader in ImageIO.getImageReadersBySuffix(suffix)) {
            try {
                reader.input = FileImageInputStream(imgFile)
                val width = reader.getWidth(reader.minIndex)
                val height = reader.getHeight(reader.minIndex)
                return Pair(width, height)
            } catch (e: IOException) {
                //skip
            } finally {
                reader.dispose()
            }
        }

        val bufferedImage = ImageIO.read(imgFile)
        return Pair(bufferedImage.width, bufferedImage.height)
    }

    data class ProcessResult(val thumbnailFile: File?, val resolutionWidth: Int, val resolutionHeight: Int, val videoDuration: Long?)
}