<script setup lang="ts">
import { computed } from "vue"

defineOptions({
    inheritAttrs: false
})

const props = defineProps<{
    value?: string
}>()

const lines = computed(() => props.value ? props.value.split("\n") : [])

</script>

<template>
    <template v-if="lines.length">
        <component v-for="line in lines" :is="line ? 'p' : 'br'" v-bind="$attrs">{{line}}</component>
    </template>
    <template v-else>
        <p v-bind="$attrs"/>
    </template>
</template>
