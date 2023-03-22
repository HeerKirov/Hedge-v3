<script setup lang="ts">
import { computed } from "vue"
import { Flex } from "@/components/layout"

// == Aspect Grid 锁定长宽比的网格排列 ==
// 一个Grid组件，将给出的items迭代生成子组件，且所有组件保持相同的长宽。
// 可以为其设置间隔。

const props = defineProps<{
    items?: any[] | null
    columnNum?: number
    aspect?: number
    spacing?: number
}>()

const rootStyle = computed(() => ({
    "--var-column-num": props.columnNum ?? 1,
    "--var-aspect": props.aspect ?? 1,
    "--var-gap": props.spacing ? `${props.spacing * 4}px` : "0px"
}))

</script>

<template>
    <Flex :style="rootStyle" :multiline="true" :spacing="spacing">
        <div v-for="(item, index) in (items ?? [])" :class="$style.item">
            <div :class="$style.content">
                <slot :item="item" :index="index"/>
            </div>
        </div>
    </Flex>
</template>

<style module lang="sass">
@import "../../styles/base/size"

.item
    position: relative
    height: 0
    width: calc((100% - (var(--var-column-num) - 1) * var(--var-gap)) / var(--var-column-num))
    padding-bottom: calc((100% - (var(--var-column-num) - 1) * var(--var-gap)) / var(--var-column-num))

    > .content
        position: absolute
        top: 0
        left: 0
        right: 0
        bottom: 0
</style>
