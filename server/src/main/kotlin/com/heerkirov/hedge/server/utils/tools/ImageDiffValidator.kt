package com.heerkirov.hedge.server.utils.tools

import com.heerkirov.hedge.server.utils.Json.toJSONString
import java.awt.image.BufferedImage
import java.io.File
import javax.imageio.ImageIO

/**
 * 图像差分压缩验证工具
 * 
 * 功能：
 * 1. 读取基准图像和多个相似图像
 * 2. 计算像素差异，只提取实际不同的像素（其他位置填充透明）
 * 3. 将差异图像编码为PNG（无损）保存
 * 4. 输出元数据（基准图ID、差异区域边界矩形等）
 * 
 * 实现方式：
 * - 创建与原图相同尺寸的透明图像
 * - 只保存实际不同的像素，相同像素保持透明
 * - 合成时：将差异图像覆盖到基准图像上即可（透明部分不影响基准图）
 */
object ImageDiffValidator {
    
    /**
     * 差异区域信息
     */
    data class DiffRegion(
        val x: Int,
        val y: Int,
        val width: Int,
        val height: Int
    )
    
    /**
     * 差异压缩结果
     */
    data class DiffResult(
        val baseImageId: String,
        val targetImageId: String,
        val diffRegion: DiffRegion,
        val diffImageFile: File,
        val originalSize: Long,
        val diffSize: Long,
        val compressionRatio: Double
    )
    
    /**
     * 处理单个图像的差分压缩
     * 
     * @param baseImageFile 基准图像文件
     * @param targetImageFile 目标图像文件
     * @param outputDir 输出目录，用于保存差异图像
     * @return 差异压缩结果
     */
    fun processDiff(
        baseImageFile: File,
        targetImageFile: File,
        outputDir: File
    ): DiffResult {
        // 读取图像
        val baseImageRaw = ImageIO.read(baseImageFile)
            ?: throw IllegalArgumentException("无法读取基准图像: ${baseImageFile.absolutePath}")
        val targetImageRaw = ImageIO.read(targetImageFile)
            ?: throw IllegalArgumentException("无法读取目标图像: ${targetImageFile.absolutePath}")
        
        // 验证尺寸
        if (baseImageRaw.width != targetImageRaw.width || baseImageRaw.height != targetImageRaw.height) {
            throw IllegalArgumentException(
                "图像尺寸不匹配: 基准图=${baseImageRaw.width}x${baseImageRaw.height}, " +
                "目标图=${targetImageRaw.width}x${targetImageRaw.height}"
            )
        }
        
        // 转换为统一的格式（ARGB）以确保像素比较的准确性
        val baseImage = convertToARGB(baseImageRaw)
        val targetImage = convertToARGB(targetImageRaw)
        
        // 计算差异区域（用于统计，但实际差异图像包含所有差异像素）
        val diffRegion = calculateDiffRegion(baseImage, targetImage)
        
        // 如果完全没有差异，返回空结果
        if (diffRegion.width == 0 || diffRegion.height == 0) {
            val emptyDiffFile = File(outputDir, "${targetImageFile.nameWithoutExtension}_diff.png")
            // 创建一个1x1的透明图像作为占位符
            val emptyImage = BufferedImage(1, 1, BufferedImage.TYPE_INT_ARGB)
            ImageIO.write(emptyImage, "png", emptyDiffFile)
            
            val result = DiffResult(
                baseImageId = baseImageFile.nameWithoutExtension,
                targetImageId = targetImageFile.nameWithoutExtension,
                diffRegion = DiffRegion(0, 0, 0, 0),
                diffImageFile = emptyDiffFile,
                originalSize = targetImageFile.length(),
                diffSize = emptyDiffFile.length(),
                compressionRatio = if (targetImageFile.length() > 0) {
                    emptyDiffFile.length().toDouble() / targetImageFile.length()
                } else 0.0
            )
            
            // 保存单个图像的元数据JSON文件
            saveSingleMetadata(result, outputDir)
            
            return result
        }
        
        // 提取差异像素（只保存实际不同的像素，其他位置透明）
        val diffImage = extractDiffPixels(baseImage, targetImage)
        
        // 保存差异图像为PNG（无损）
        val diffFileName = "${targetImageFile.nameWithoutExtension}_diff.png"
        val diffFile = File(outputDir, diffFileName)
        ImageIO.write(diffImage, "png", diffFile)
        
        // 计算压缩率
        val originalSize = targetImageFile.length()
        val diffSize = diffFile.length()
        val compressionRatio = if (originalSize > 0) {
            diffSize.toDouble() / originalSize
        } else 0.0
        
        val result = DiffResult(
            baseImageId = baseImageFile.nameWithoutExtension,
            targetImageId = targetImageFile.nameWithoutExtension,
            diffRegion = diffRegion,
            diffImageFile = diffFile,
            originalSize = originalSize,
            diffSize = diffSize,
            compressionRatio = compressionRatio
        )
        
        // 保存单个图像的元数据JSON文件
        saveSingleMetadata(result, outputDir)
        
        return result
    }
    
    /**
     * 计算两个图像的差异区域（最小边界矩形）
     * 注意：此方法仅用于统计和元数据，实际差异图像包含所有差异像素（全尺寸，透明填充）
     * 
     * @param baseImage 基准图像
     * @param targetImage 目标图像
     * @return 差异区域的最小边界矩形（用于统计）
     */
    private fun calculateDiffRegion(baseImage: BufferedImage, targetImage: BufferedImage): DiffRegion {
        val width = baseImage.width
        val height = baseImage.height
        
        var minX = width
        var minY = height
        var maxX = -1
        var maxY = -1
        
        // 遍历所有像素，找出有差异的区域
        for (y in 0 until height) {
            for (x in 0 until width) {
                val baseRgb = baseImage.getRGB(x, y)
                val targetRgb = targetImage.getRGB(x, y)
                
                if (baseRgb != targetRgb) {
                    if (x < minX) minX = x
                    if (x > maxX) maxX = x
                    if (y < minY) minY = y
                    if (y > maxY) maxY = y
                }
            }
        }
        
        // 如果没有差异
        if (maxX < minX || maxY < minY) {
            return DiffRegion(0, 0, 0, 0)
        }
        
        // 返回边界矩形（包含边界）
        return DiffRegion(
            x = minX,
            y = minY,
            width = maxX - minX + 1,
            height = maxY - minY + 1
        )
    }
    
    /**
     * 将图像转换为ARGB格式，确保像素比较的准确性
     */
    private fun convertToARGB(image: BufferedImage): BufferedImage {
        if (image.type == BufferedImage.TYPE_INT_ARGB) {
            return image
        }
        val converted = BufferedImage(image.width, image.height, BufferedImage.TYPE_INT_ARGB)
        val graphics = converted.createGraphics()
        graphics.drawImage(image, 0, 0, null)
        graphics.dispose()
        return converted
    }
    
    /**
     * 提取差异像素，创建一个与原图相同尺寸的图像
     * 只保存实际不同的像素，其他位置填充透明
     * 
     * @param baseImage 基准图像
     * @param targetImage 目标图像
     * @return 差异图像（与原图相同尺寸，只有差异像素有颜色，其他位置透明）
     */
    private fun extractDiffPixels(baseImage: BufferedImage, targetImage: BufferedImage): BufferedImage {
        val width = baseImage.width
        val height = baseImage.height
        
        // 创建与原图相同尺寸的透明图像
        val diffImage = BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB)
        
        // 遍历所有像素，只复制差异像素
        for (y in 0 until height) {
            for (x in 0 until width) {
                val baseRgb = baseImage.getRGB(x, y)
                val targetRgb = targetImage.getRGB(x, y)
                
                // 只保存不同的像素，相同像素保持透明
                if (baseRgb != targetRgb) {
                    diffImage.setRGB(x, y, targetRgb)
                } else {
                    // 设置为完全透明
                    diffImage.setRGB(x, y, 0x00000000)
                }
            }
        }
        
        return diffImage
    }
    
    /**
     * 批量处理多个相似图像
     * 
     * @param baseImageFile 基准图像文件
     * @param targetImageFiles 目标图像文件列表
     * @param outputDir 输出目录
     * @return 所有差异压缩结果
     */
    fun processBatch(
        baseImageFile: File,
        targetImageFiles: List<File>,
        outputDir: File
    ): List<DiffResult> {
        // 确保输出目录存在
        if (!outputDir.exists()) {
            outputDir.mkdirs()
        }
        
        return targetImageFiles.map { targetFile ->
            try {
                processDiff(baseImageFile, targetFile, outputDir)
            } catch (e: Exception) {
                throw RuntimeException("处理图像失败: ${targetFile.name}", e)
            }
        }
    }
    
    /**
     * 保存单个图像的元数据JSON文件
     * 
     * @param result 差异压缩结果
     * @param outputDir 输出目录
     */
    private fun saveSingleMetadata(result: DiffResult, outputDir: File) {
        val metadata = mapOf(
            "baseImageId" to result.baseImageId,
            "targetImageId" to result.targetImageId,
            "diffRegion" to mapOf(
                "x" to result.diffRegion.x,
                "y" to result.diffRegion.y,
                "width" to result.diffRegion.width,
                "height" to result.diffRegion.height
            ),
            "diffImagePath" to result.diffImageFile.name,
            "originalSize" to result.originalSize,
            "diffSize" to result.diffSize,
            "compressionRatio" to result.compressionRatio
        )
        
        val metadataFile = File(outputDir, "${result.targetImageId}_diff.json")
        metadataFile.writeText(metadata.toJSONString())
    }
    
    /**
     * 将多个结果保存为统一的JSON元数据文件（可选功能，用于汇总）
     */
    fun saveMetadata(results: List<DiffResult>, outputFile: File) {
        val metadata = results.map { result ->
            mapOf(
                "baseImageId" to result.baseImageId,
                "targetImageId" to result.targetImageId,
                "diffRegion" to mapOf(
                    "x" to result.diffRegion.x,
                    "y" to result.diffRegion.y,
                    "width" to result.diffRegion.width,
                    "height" to result.diffRegion.height
                ),
                "diffImagePath" to result.diffImageFile.name,
                "originalSize" to result.originalSize,
                "diffSize" to result.diffSize,
                "compressionRatio" to result.compressionRatio
            )
        }
        
        outputFile.writeText(metadata.toJSONString())
    }
}

/**
 * 命令行工具入口
 * 
 * 使用方法：
 * java -cp ... ImageDiffValidatorKt <baseImage> <targetImage1> [targetImage2] ... [targetImageN] <outputDir>
 */
fun main(args: Array<String>) {
    if (args.size < 3) {
        println("用法: ImageDiffValidator <基准图像> <目标图像1> [目标图像2] ... [目标图像N] <输出目录>")
        println("示例: ImageDiffValidator base.jpg img1.jpg img2.jpg img3.jpg ./output")
        System.exit(1)
    }
    
    val baseImageFile = File(args[0])
    val outputDir = File(args.last())
    val targetImageFiles = args.sliceArray(1 until args.size - 1).map { File(it) }
    
    // 验证文件存在
    if (!baseImageFile.exists()) {
        System.err.println("错误: 基准图像不存在: ${baseImageFile.absolutePath}")
        System.exit(1)
    }
    
    targetImageFiles.forEach { file ->
        if (!file.exists()) {
            System.err.println("错误: 目标图像不存在: ${file.absolutePath}")
            System.exit(1)
        }
    }
    
    try {
        println("开始处理 ${targetImageFiles.size} 个图像...")
        println("基准图像: ${baseImageFile.name}")
        println("输出目录: ${outputDir.absolutePath}")
        println()
        
        val results = ImageDiffValidator.processBatch(baseImageFile, targetImageFiles, outputDir)
        
        // 每个图像的元数据已自动保存为独立的JSON文件
        // 不再生成统一的metadata.json，避免多次测试时覆盖
        
        // 打印统计信息
        println("处理完成！")
        println()
        println("统计信息:")
        println("  总图像数: ${results.size}")
        println("  平均压缩率: ${String.format("%.2f%%", results.map { it.compressionRatio * 100 }.average())}")
        
        val totalOriginalSize = results.sumOf { it.originalSize }
        val totalDiffSize = results.sumOf { it.diffSize }
        val totalCompressionRatio = if (totalOriginalSize > 0) {
            totalDiffSize.toDouble() / totalOriginalSize
        } else 0.0
        println("  总原始大小: ${totalOriginalSize / 1024} KB")
        println("  总差异大小: ${totalDiffSize / 1024} KB")
        println("  总体压缩率: ${String.format("%.2f%%", totalCompressionRatio * 100)}")
        println()
        
        println("详细信息:")
        results.forEachIndexed { index, result ->
            println("  ${index + 1}. ${result.targetImageId}")
            println("     差异区域: (${result.diffRegion.x}, ${result.diffRegion.y}) " +
                    "${result.diffRegion.width}x${result.diffRegion.height}")
            println("     原始大小: ${result.originalSize / 1024} KB")
            println("     差异大小: ${result.diffSize / 1024} KB")
            println("     压缩率: ${String.format("%.2f%%", result.compressionRatio * 100)}")
        }
        
        println()
        println("每个图像的元数据已保存为独立的JSON文件:")
        results.forEach { result ->
            val metadataFile = File(outputDir, "${result.targetImageId}_diff.json")
            println("  - ${metadataFile.name}")
        }
        
    } catch (e: Exception) {
        System.err.println("错误: ${e.message}")
        e.printStackTrace()
        System.exit(1)
    }
}

