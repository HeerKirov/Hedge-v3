package com.heerkirov.hedge.server.utils

import com.heerkirov.hedge.server.exceptions.IllegalFileExtensionError
import com.heerkirov.hedge.server.exceptions.be
import java.awt.MediaTracker
import java.awt.RenderingHints
import java.awt.Toolkit
import java.awt.image.BufferedImage
import java.io.File
import java.util.concurrent.ConcurrentHashMap
import javax.imageio.ImageIO
import javax.swing.JPanel
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sqrt

object Similarity {
    private const val SIMPLE_HASH_PRECISION = 16
    private const val HASH_PRECISION = 32
    init {
        //在mac上，调用Graphics组件时，会生成一个愚蠢的dock栏进程。为了隐藏掉这个进程，需要设置此属性
        System.setProperty("apple.awt.UIElement", "true")
    }

    /**
     * 对目标文件执行综合分析，得出多个指纹。
     * @throws IllegalFileExtensionError 不支持的文件类型。
     */
    fun process(src: File): ProcessResult {
        val srcImage = when (src.extension.lowercase()) {
            "jpeg", "jpg" -> loadJpg(src)
            "png" -> ImageIO.read(src)
            else -> throw be(IllegalFileExtensionError(src.extension))
        }
        val resizedImage = resize(srcImage, HASH_PRECISION, HASH_PRECISION)
        val simpleResizedImage = resize(srcImage, SIMPLE_HASH_PRECISION, SIMPLE_HASH_PRECISION)
        val grayscale = grayscale(resizedImage)
        val simpleGrayscale = grayscale(simpleResizedImage)

        val pHashSimple = run {
            val dct = dct(simpleGrayscale, SIMPLE_HASH_PRECISION)
            val matrix = matrix(dct, SIMPLE_HASH_PRECISION, SIMPLE_HASH_PRECISION / 4)
            val avg = (matrix.sum() - matrix[0]) / (matrix.size - 1)
            val bits = matrix.map { if (it >= avg) 1 else 0 }
            bits.joinToString("")
        }
        val pHash = run {
            val dct = dct(grayscale, HASH_PRECISION)
            val matrix = matrix(dct, HASH_PRECISION, HASH_PRECISION / 4)
            val avg = (matrix.sum() - matrix[0]) / (matrix.size - 1)
            val bits = matrix.map { if (it >= avg) 1 else 0 }
            bits.joinToString("")
        }
        val dHashSimple = run {
            val diff = difference(simpleGrayscale, SIMPLE_HASH_PRECISION)
            diff.joinToString("")
        }
        val dHash = run {
            val diff = difference(grayscale, HASH_PRECISION)
            diff.joinToString("")
        }

        return ProcessResult(pHashSimple, dHashSimple, pHash, dHash)
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
     * 平均哈希算法。
     * @param precision 精度，相当于缩放后的哈希图的尺寸。指纹长度等于精度^2。
     */
    fun averageHash(src: File, precision: Int): String {
        val srcImage = ImageIO.read(src)
        val resizedImage = resize(srcImage, precision, precision)
        val arr = grayscale(resizedImage)
        val avg = arr.average().roundToInt()
        val bits = arr.map { if (it >= avg) 1 else 0 }

        return bits.joinToString("")
    }

    /**
     * 感知哈希算法。
     * @param precision 精度，相当于缩放后的哈希图的尺寸。指纹长度等于(精度/4)^2。
     */
    fun perceiveHash(src: File, precision: Int): String {
        val srcImage = ImageIO.read(src)
        val resizedImage = resize(srcImage, precision, precision)
        val arr = grayscale(resizedImage)
        val dct = dct(arr, precision)
        val matrix = matrix(dct, precision, precision / 4)
        val avg = (matrix.sum() - matrix[0]) / (matrix.size - 1)
        val bits = matrix.map { if (it >= avg) 1 else 0 }

        return bits.joinToString("")
    }

    /**
     * 渐变哈希算法。
     * @param precision 精度，相当于缩放后的哈希图尺寸。指纹长度等于精度^2。
     */
    fun differenceHash(src: File, precision: Int): String {
        val srcImage = ImageIO.read(src)
        val resizedImage = resize(srcImage, precision, precision)
        val arr = grayscale(resizedImage)
        val diff = difference(arr, precision)

        return diff.joinToString("")
    }

    /**
     * 计算汉明距离。
     */
    fun hammingDistance(f1: String, f2: String): Double {
        var distance = 0
        f1.forEachIndexed { index, i1 ->
            if(i1 != f2[index]) {
                distance += 1
            }
        }
        return (f1.length - distance).toDouble() / f1.length
    }

    /**
     * 计算余弦距离。
     */
    fun cosineDistance(f1: String, f2: String): Double {
        var innerProduct = 0
        var vec1 = 0
        var vec2 = 0
        for (i in f1.indices) {
            val c1 = if(f1[i] == '1') 1 else 0
            val c2 = if(f2[i] == '1') 1 else 0
            innerProduct += c1 * c2
            vec1 += c1 * c1
            vec2 += c2 * c2
        }
        val outerProduct = sqrt(vec1.toDouble()) * sqrt(vec2.toDouble())

        return innerProduct / outerProduct
    }

    /**
     * 将image缩放至目标大小。
     */
    private fun resize(source: BufferedImage, targetWidth: Int, targetHeight: Int): BufferedImage {
        //一个hack：在Linux上似乎有可能将PNG格式读为0，但手动设置5似乎是可行的。
        //https://stackoverflow.com/questions/5836128/how-do-i-make-javas-imagebuffer-to-read-a-png-file-correctly
        return BufferedImage(targetWidth, targetHeight, if(source.type == 0) BufferedImage.TYPE_3BYTE_BGR else source.type).apply {
            createGraphics().apply {
                try {
                    setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR)
                    drawImage(source, 0, 0, targetWidth, targetHeight, 0, 0, source.width, source.height, null)
                }finally {
                    dispose()
                }
            }
        }
    }

    /**
     * 根据image的RGB，生成灰度数组。其长度相当于WxH，每个值相当于一个点上的像素RGB的均值。
     */
    private fun grayscale(source: BufferedImage): IntArray {
        val arr = source.getRGB(0, 0, source.width, source.height, null, 0, source.width)
        return arr.map { c ->
            val r = (c and 0xFF0000) shr 16
            val g = (c and 0x00FF00) shr 8
            val b = (c and 0x0000FF)
            (r + g + b) / 3
        }.toIntArray()
    }

    /**
     * 根据灰度数组，计算此数组DCT变换后的结果。
     */
    private fun dct(signal: IntArray, size: Int): DoubleArray {
        val coefficientCache = coefficientsCache.computeIfAbsent(size, Similarity::CoefficientCache)
        val cosineCache = cosineCache.computeIfAbsent(size, Similarity::CosineCache)
        val ret = DoubleArray(signal.size)
        for(u in 0 until size) {
            for(v in 0 until size) {
                var sum = 0.0
                for(i in 0 until size) {
                    for(j in 0 until size) {
                        sum += signal[i * size + j] * cosineCache[u, i] * cosineCache[v, j]
                    }
                }
                ret[u * size + v] = sum * coefficientCache[u, v]
            }
        }
        return ret
    }

    /**
     * 根据DCT变换结果生成矩阵，获取矩阵左上角的结果。
     */
    private fun matrix(dct: DoubleArray, size: Int, range: Int): List<Double> {
        val ret = ArrayList<Double>(range * range)
        for(i in 0 until range) {
            for(j in 0 until range) {
                ret.add(dct[i * size + j])
            }
        }
        return ret
    }

    /**
     * 根据灰度数组，计算每一行中，后一个像素与前一个像素的颜色值的变化，构成变化数组。
     */
    private fun difference(signal: IntArray, size: Int): IntArray {
        val ret = IntArray((size - 1) * size)
        for(i in 0 until size) {
            for(j in 0 until (size - 1)) {
                ret[i * (size - 1) + j] = if(signal[i * size + j + 1] > signal[i * size + j]) 1 else 0
            }
        }
        return ret
    }

    private val coefficientsCache = ConcurrentHashMap<Int, CoefficientCache>()

    private val cosineCache = ConcurrentHashMap<Int, CosineCache>()

    private class CoefficientCache(size: Int) {
        private val arr = DoubleArray(3) {
            when(it) {
                0 -> 1.0 / size
                1 -> sqrt(2.0) / size
                else -> 2.0 / size
            }
        }

        operator fun get(u: Int, v: Int): Double {
            return if(u == 0 && v == 0) arr[0]
            else if(u != 0 && v != 0) arr[2]
            else arr[1]
        }
    }

    private class CosineCache(private val size: Int) {
        private val arr = DoubleArray(size * size)

        init {
            for(u in 0 until size) {
                for(i in 0 until size) {
                    arr[u * size + i] = cos((i + 0.5) * u * PI / size)
                }
            }
        }

        operator fun get(u: Int, i: Int): Double {
            return arr[u * size + i]
        }
    }

    data class ProcessResult(val pHashSimple: String, val dHashSimple: String, val pHash: String, val dHash: String)
}
