<script setup lang="ts">
import { toRef } from "vue"
import { installCurrentTab, BrowserStackView } from "@/modules/browser"

const props = defineProps<{
    view: BrowserStackView
    active: boolean
    index: number
}>()

installCurrentTab(toRef(props, "index"))

</script>

<template>
    <div :class="{[$style.tab]: true, [$style.active]: active}">
        <div v-for="s in view.stacks" :key="s.historyId" :class="$style.stack"><component :is="s.component"/></div>
    </div>
</template>

<style module lang="sass">

.tab
    position: absolute
    left: 0
    top: 0
    width: 100%
    height: 100%
    &:not(.active)
        visibility: hidden
    > .stack
        position: absolute
        left: 0
        top: 0
        width: 100%
        height: 100%
        &:not(:last-child)
            visibility: hidden
</style>