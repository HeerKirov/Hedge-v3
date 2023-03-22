<script setup lang="ts">
import { AspectGrid } from "@/components/layout"
import { useAssets } from "@/functions/app"

// == Grid Images 网格状图像排布显示 ==
// 一个img的Grid组件。它用于将一组img组成Grid，并按指定的样式显示出来。

const props = defineProps<{
    images: string[]
    columnNum?: number
    aspect?: number
}>()

const { assetsUrl } = useAssets()

</script>

<template>
    <AspectGrid :items="images" v-slot="{ item }" :column-num="columnNum" :aspect="aspect" :spacing="1">
        <img :class="$style.img" :src="assetsUrl(item)" :alt="item"/>
    </AspectGrid>
</template>

<style module lang="sass">
@import "../../styles/base/size"

.img
    height: 100%
    width: 100%
    border-radius: $radius-size-std
    object-position: center
    object-fit: cover
</style>
