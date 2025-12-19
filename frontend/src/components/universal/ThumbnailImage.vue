<script setup lang="ts">
import { computed } from "vue"
import { NumBadge } from "@/components/universal"
import { useAssets } from "@/functions/app"
import { startDragFile } from "@/modules/others"
import { remoteIpcClient } from "@/functions/ipc-client"
import { useFetchHelper } from "@/functions/fetch"

// == Thumbnail Image 缩略图模块 ==
// 用于在侧边栏等位置显示缩略图。它将图像大小限制在固定的方框内，在区域内保持图像等比缩放。
// 额外功能：在右上角显示一个数量角标。
// 额外功能：允许拖曳显示的图像文件。可指定使用另一个路径的图像，可指定拖曳时显示的图像。
// 尺寸：默认占满宽度，使用maxHeight规定image的最大高度。使用aspect可规定maxHeight为宽度的一定比例，但仍不可超出最大高度。
// 当指定aspect时，将转而保持宽高比。

const props = defineProps<{
    file?: string | null
    draggableFile?: string | null
    dragIconFile?: string | null
    originalFilename?: string | null
    alt?: string
    numTagValue?: number,
    minHeight?: string,
    maxHeight?: string
    aspect?: number
}>()

const { assetsUrl, assetsLocal } = useAssets()

const divStyle = computed(() => ({
    "aspect-ratio": props.aspect
}))

const imgStyle = computed(() => ({
    "min-height": props.minHeight ?? "4rem",
    "max-height": props.maxHeight
}))

const fetchFileInfo = useFetchHelper(client => client.fileUtil.fileInfo)

const onDragstart = async (e: DragEvent) => {
    if(props.draggableFile && props.file) {
        e.preventDefault()
        let originalFilename: string | undefined
        if(props.originalFilename) {
            originalFilename = props.originalFilename
        }else{
            const idx1 = props.draggableFile.lastIndexOf("/"), idx2 = props.draggableFile.lastIndexOf(".")
            const id = idx1 !== -1 && idx2 !== -1 ? parseInt(props.draggableFile.substring(idx1 + 1, idx2)) : idx1 !== -1 ? parseInt(props.draggableFile.substring(idx1 + 1)) : undefined
            if(id) {
                originalFilename = (await fetchFileInfo(id))?.fileName
            }else{
                originalFilename = undefined
            }
        }
        const filepath = await remoteIpcClient.local.makeDragFile({filepath: props.draggableFile, originalFilename})
        const thumbnail = await assetsLocal(props.dragIconFile ?? props.file)
        startDragFile(thumbnail, filepath)
    }
}

</script>

<template>
    <div :class="$style['thumbnail-image']" :style="divStyle">
        <img :src="assetsUrl(props.file ?? null)" :style="imgStyle" :alt="originalFilename ?? alt" @dragstart="onDragstart"/>
        <NumBadge v-if="numTagValue !== undefined" fixed="right-top" :num="numTagValue"/>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/size"
@use "@/styles/base/color"

.thumbnail-image
    text-align: center
    position: relative
    width: 100%
    max-height: 100%

    > img
        width: 100%
        height: 100%
        box-sizing: border-box
        object-fit: contain
        object-position: center
        border-radius: size.$radius-size-std
        border: solid 1px color.$light-mode-border-color
        @media (prefers-color-scheme: dark)
            border-color: color.$dark-mode-border-color
</style>
