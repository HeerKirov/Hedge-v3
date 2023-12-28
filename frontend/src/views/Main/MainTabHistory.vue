<script setup lang="ts">
import {toRef, watch} from "vue"
import { BrowserStackView } from "@/modules/browser"
import { installGlobalKeyStack } from "@/modules/keyboard"

const props = defineProps<{
    stack: BrowserStackView["stacks"][number]
    active: boolean
}>()

installGlobalKeyStack(toRef(props, "active"))

watch(() => props.stack.component, c => console.log("component changed", c))

</script>

<template>
    <div :class="$style.stack"><component :is="stack.component"/></div>
</template>

<style module lang="sass">
.stack
    position: absolute
    left: 0
    top: 0
    width: 100%
    height: 100%
    &:not(:last-child)
        visibility: hidden
</style>