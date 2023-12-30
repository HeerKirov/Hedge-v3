<script setup lang="ts">
import { BrowserTabStack } from "@/modules/browser"
import MainTabHistory from "./MainTabHistory.vue"

defineProps<{
    view: BrowserTabStack
    active: boolean
}>()

</script>

<template>
    <div :class="{[$style.tab]: true, [$style.active]: active}">
        <MainTabHistory v-for="s in view.stacks" :key="s.historyId" :id="view.id" :history-id="s.historyId" :component="s.component"/>
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