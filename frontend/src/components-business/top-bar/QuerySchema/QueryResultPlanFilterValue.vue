<script setup lang="ts">
import { FilterValue } from "@/functions/http-client/api/util-query"

defineProps<{
    value: FilterValue
}>()

</script>

<template>
    <span v-if="value.type === 'equal'">
        {{value.value}}
    </span>
    <span v-else-if="value.type === 'match'">
        <b class="mr-1">≈</b>{{value.value}}
    </span>
    <span v-else-if="value.begin !== null && value.end !== null" :brackets="(value.includeBegin ? '[' : '(') + (value.includeEnd ? ']' : ')')">
        {{value.begin}}<b class="mx-1">~</b>{{value.end}}
    </span>
    <span v-else-if="value.end === null">
        <b class="mr-1">{{value.includeBegin ? "≥" : ">"}}</b>{{value.begin}}
    </span>
    <span v-else>
        <b class="mr-1">{{value.includeEnd ? "≤" : "<"}}</b>{{value.end}}
    </span>
</template>

<style module lang="sass">

</style>
