# 图像差分压缩验证工具

这是一个用于验证差分图像压缩方案的简单工具。它可以将多个相似图像与基准图像对比，提取差异区域并保存为独立的PNG文件。

## 功能

- 读取基准图像和多个相似图像
- 计算像素级差异，只提取实际不同的像素（其他位置透明）
- 将差异图像编码为PNG（无损）
- 为每个图像生成独立的元数据JSON文件，包含差异区域坐标、文件大小等信息
- 计算压缩率和统计信息

## 使用方法

### 方法1: 使用运行脚本（推荐，最简单）

```bash
cd server
./run_image_diff_validator.sh <基准图像> <目标图像1> [目标图像2] ... [目标图像N] <输出目录>
```

示例：
```bash
./run_image_diff_validator.sh base.jpg img1.jpg img2.jpg img3.jpg ./output
```

### 方法2: 使用Gradle任务运行

```bash
cd server
./gradlew runImageDiffValidator --args="<基准图像> <目标图像1> [目标图像2] ... [目标图像N] <输出目录>"
```

示例：
```bash
./gradlew runImageDiffValidator --args="base.jpg img1.jpg img2.jpg img3.jpg ./output"
```

### 方法3: 编译后直接运行Java

首先编译项目：
```bash
cd server
./gradlew build
```

然后运行工具（需要手动构建类路径，较为复杂，不推荐）：
```bash
java -cp "build/classes/kotlin/main:build/resources/main:$(./gradlew -q printClasspath)" \
  com.heerkirov.hedge.server.utils.tools.ImageDiffValidatorKt \
  <基准图像> <目标图像1> [目标图像2] ... [目标图像N] <输出目录>
```

### 方法4: 使用JAR包运行（高级用法）

如果需要打包成JAR：
```bash
cd server
./gradlew shadowJar  # 如果有shadow插件
java -jar build/libs/hedge-v3-server-*.jar <基准图像> <目标图像1> ... <输出目录>
```

## 参数说明

- `<基准图像>`: 作为对比基准的图像文件路径（如 base.jpg）
- `<目标图像1> ... <目标图像N>`: 需要与基准图像对比的一个或多个图像文件路径
- `<输出目录>`: 用于保存差异图像和元数据文件的目录路径

## 输出说明

工具会在输出目录中生成以下文件：

1. **差异图像文件**: `{目标图像名}_diff.png`
   - 与原图相同尺寸的透明图像
   - 只包含与基准图像不同的像素，其他位置填充透明
   - 使用PNG无损格式保存
   - **合成方法**: 将差异图像覆盖到基准图像上即可（透明部分不会影响基准图）

2. **元数据文件**: `{目标图像名}_diff.json`（每个图像一个独立的JSON文件）
   - 包含该图像的详细信息
   - 包括差异区域的最小边界矩形坐标（用于统计）、原始大小、差异大小、压缩率等
   - **优势**: 每个图像有独立的元数据文件，可以在同一输出目录中多次测试而不会覆盖之前的结果

## 输出示例

```
开始处理 3 个图像...
基准图像: base.jpg
输出目录: /path/to/output

处理完成！

统计信息:
  总图像数: 3
  平均压缩率: 15.23%
  总原始大小: 10240 KB
  总差异大小: 1558 KB
  总体压缩率: 15.21%

详细信息:
  1. img1
     差异区域: (100, 50) 200x150
     原始大小: 3413 KB
     差异大小: 519 KB
     压缩率: 15.21%
  ...

每个图像的元数据已保存为独立的JSON文件:
  - img1_diff.json
  - img2_diff.json
  - img3_diff.json
```

## 注意事项

1. **图像尺寸**: 所有图像必须与基准图像具有相同的尺寸
2. **图像格式**: 支持所有Java ImageIO支持的格式（JPEG、PNG、GIF、BMP等）
3. **性能**: 对于大图像，处理时间可能与图像像素数成正比
4. **内存**: 图像会完全加载到内存中，确保有足够的可用内存

## 技术细节

- 使用Java BufferedImage进行像素级对比
- **差异提取方式**: 创建与原图相同尺寸的透明图像，只保存实际不同的像素
  - 优势：避免包含大量相同像素，压缩率更高
  - 对于多处分散的差异，不会产生巨大的矩形区域
- 差异图像使用PNG无损格式保存（支持透明通道）
- 元数据使用JSON格式保存
- **合成方法**: 使用图像库的alpha compositing将差异图像覆盖到基准图像上

### 合成示例代码（Kotlin/Java）

```kotlin
import java.awt.Graphics2D
import java.awt.image.BufferedImage
import javax.imageio.ImageIO
import java.io.File

fun composeImage(baseImageFile: File, diffImageFile: File, outputFile: File) {
    val baseImage = ImageIO.read(baseImageFile)
    val diffImage = ImageIO.read(diffImageFile)
    
    // 创建合成图像（复制基准图像）
    val composed = BufferedImage(
        baseImage.width, 
        baseImage.height, 
        BufferedImage.TYPE_INT_ARGB
    )
    val graphics = composed.createGraphics()
    
    // 先绘制基准图像
    graphics.drawImage(baseImage, 0, 0, null)
    // 再覆盖差异图像（透明部分不会影响基准图）
    graphics.drawImage(diffImage, 0, 0, null)
    
    graphics.dispose()
    
    // 保存合成结果
    ImageIO.write(composed, "png", outputFile)
}
```

## 未来改进方向

1. 支持透明通道的处理
2. 优化大图像的处理性能（分块处理）
3. 支持自定义差异阈值（容差）
4. 支持多个差异区域（如果图像有多处不连续差异）
5. 集成到后端存储系统中

