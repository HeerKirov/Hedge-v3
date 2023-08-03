<script setup lang="ts">
import { AspectGrid } from "@/components/layout"
import { SimpleIllust } from "@/functions/http-client/api/illust"
import { useDroppable } from "@/modules/drag"
import { useMessageBox } from "@/modules/message-box"
import { useAssets } from "@/functions/app"

const props = defineProps<{
    value: SimpleIllust[]
}>()

const emit = defineEmits<{
    (e: "update:value", v: SimpleIllust[]): void
}>()

const message = useMessageBox()
const { assetsUrl } = useAssets()

const { dragover: _, ...dropEvents } = useDroppable("illusts", illusts => {
    const forbidden: number[] = []
    const append: SimpleIllust[] = []
    for (const illust of illusts) {
        if(illust.type === "COLLECTION") {
            forbidden.push(illust.id)
        }else if(props.value.findIndex(i => i.id === illust.id) === -1) {
            append.push({id: illust.id, filePath: illust.filePath})
        }
    }
    if(forbidden.length) message.showOkMessage("prompt", "图库集合不能用作示例。", `错误的项目: ${forbidden.join(", ")}`)
    if(append.length) emit("update:value", [...props.value, ...append])
})

</script>

<template>
    <AspectGrid :items="value" :aspect="2" :spacing="1" v-slot="{ item }">
        <img :src="assetsUrl(item.filePath.sample)"/>
    </AspectGrid>
    <div :class="$style['drop-area']" v-bind="dropEvents">
        <div>拖动图像到此处以添加示例</div>
    </div>
</template>

<style module lang="sass">
@import "../../styles/base/size"

.drop-area
    position: relative
    height: 0
    width: 100%
    margin-top: 0.25rem
    padding-top: 25%
    padding-bottom: 25%

    > div
        position: absolute
        border-radius: $radius-size-std
        border: dashed 1px darkgrey
        top: 0
        left: 0
        width: 100%
        height: 100%
        display: flex
        justify-content: center
        align-items: center
</style>
