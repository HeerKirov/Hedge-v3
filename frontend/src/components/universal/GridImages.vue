<script setup lang="ts">
import { AspectGrid } from "@/components/layout"
import { useAssets } from "@/functions/app"

// == Grid Images 网格状图像排布显示 ==
// 一个img的Grid组件。它用于将一组img组成Grid，并按指定的样式显示出来。

const props = defineProps<{
    images: (string | null | undefined)[]
    columnNum?: number
    aspect?: number
    clickable?: boolean
}>()

const emit = defineEmits<{
    (e: "click", item: string | null | undefined, index: number): void
}>()

const { assetsUrl } = useAssets()

const click = (item: string | null | undefined, index: number) => {
    if(props.clickable) {
        emit("click", item, index)
    }
}

</script>

<template>
    <AspectGrid :items="images" :column-num="columnNum" :aspect="aspect" :spacing="1" v-slot="{ item, index }">
        <img :class="{'is-cursor-pointer': clickable}" :src="assetsUrl(item)" :alt="item ?? 'null'" @click="click(item, index)"/>
    </AspectGrid>
</template>
