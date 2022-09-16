<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
    value?: string
}>()

const lines = computed(() => props.value ? props.value.split("\n") : [])

</script>

<script lang="ts">
export default {
    inheritAttrs: false
}
</script>

<template>
    <template v-if="lines.length">
        <p v-bind="$attrs" v-for="line in lines">{{line}}</p>
    </template>
    <template v-else>
        <p v-bind="$attrs"/>
    </template>
</template>
