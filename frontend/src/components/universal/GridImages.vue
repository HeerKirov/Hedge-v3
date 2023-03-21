<script setup lang="ts">
import { computed } from "vue"
import { Flex } from "@/components/layout"
import { useAssets } from "@/functions/app"

// == Grid Images 网格状图像排布显示 ==
// 一个img的Grid组件。它用于将一组img组成Grid，并按指定的样式显示出来。
// - 组件的列数是固定的，限制的范围是1～16。
// - 组件中每个img的宽高比是固定的；
// - 提供一些常规样式调整属性；
// - 可以在img中通过slot的形式编辑自定义dom结构。

const props = defineProps<{
    images: string[]
    columnNum?: number
    aspect?: number
    fitType?: "contain" | "cover"
}>()

const { assetsUrl } = useAssets()

const rootStyle = computed(() => ({
    "--var-column-num": props.columnNum ?? 1,
    "--var-aspect": props.aspect ?? 1,
    "--var-fit-type": props.fitType ?? "cover"
}))

</script>

<template>
    <Flex :style="rootStyle" :multiline="true" :spacing="1">
        <div v-for="image in images" :class="$style.item">
            <div :class="$style.content">
                <img :src="assetsUrl(image)" :alt="image"/>
            </div>
        </div>
    </Flex>
</template>

<style module lang="sass">
@import "../../styles/base/size"

.item
    position: relative
    height: 0
    width: calc((100% - (var(--var-column-num) - 1) * 0.25rem) / var(--var-column-num))
    padding-bottom: calc((100% - (var(--var-column-num) - 1) * 0.25rem) / var(--var-column-num))

    > .content
        position: absolute
        top: 0
        left: 0
        right: 0
        bottom: 0

        > img
            height: 100%
            width: 100%
            border-radius: $radius-size-std
            object-position: center
            object-fit: var(--var-fit-type, cover)
</style>
