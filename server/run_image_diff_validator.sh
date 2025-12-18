#!/bin/bash

# 图像差分压缩验证工具运行脚本
# 
# 使用方法: ./run_image_diff_validator.sh <基准图像> <目标图像1> [目标图像2] ... [目标图像N] <输出目录>
#
# 示例: ./run_image_diff_validator.sh base.jpg img1.jpg img2.jpg img3.jpg ./output

cd "$(dirname "$0")"

# 使用gradle任务运行，自动处理编译和类路径
# 将参数用引号包裹并传递给gradle
./gradlew runImageDiffValidator --args="$*"
