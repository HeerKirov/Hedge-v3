<script setup lang="ts">
import { toRef } from "vue"
import { installCurrentTab, BrowserStackView } from "@/modules/browser"
import MainTabHistory from "./MainTabHistory.vue"

const props = defineProps<{
    view: BrowserStackView
    active: boolean
    index: number
}>()

installCurrentTab(toRef(props, "index"))

</script>

<template>
    <div :class="{[$style.tab]: true, [$style.active]: active}">
        <MainTabHistory v-for="(s, i) in view.stacks" :key="s.historyId" :stack="s" :active="active && i === view.stacks.length - 1"/>
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
</style>