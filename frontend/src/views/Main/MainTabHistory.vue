<script setup lang="ts">
import type { Component, DefineComponent } from "vue"
import { installCurrentTab } from "@/modules/browser"
import { installGlobalKeyStack } from "@/modules/keyboard"

const props = defineProps<{
    id: number
    historyId: number
    component: Component | DefineComponent
}>()

const { active } = installCurrentTab(props)

installGlobalKeyStack(active)

</script>

<template>
    <div :id="`history-${historyId}`" :class="$style.stack"><component :is="component"/></div>
</template>

<style module lang="sass">
.stack
    position: absolute
    left: 0
    top: 0
    width: 100%
    height: 100%
    container-type: inline-size
    container-name: tab
    &:not(:last-child)
        visibility: hidden
</style>