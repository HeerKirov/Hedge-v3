<script setup lang="ts">
import { Flex } from "@/components/layout"
import { FilterGroup } from "@/functions/http-client/api/util-query"
import { QUERY_FIELD_NAMES } from "@/constants/translate"
import QueryResultPlanFilterValue from "./QueryResultPlanFilterValue.vue"

defineProps<{
    filterGroup: FilterGroup
}>()

</script>

<template>
    <Flex>
        <b :class="$style.exclude">{{filterGroup.exclude ? '-' : ''}}</b>
        <div>
            <template v-for="(oneField, idx) in filterGroup.fields">
                <b v-if="idx > 0" class="ml-1 mr-half">|</b>
                <div :class="$style['field-name']"><b>{{QUERY_FIELD_NAMES[oneField.name] ?? oneField.name}}</b></div>
                <QueryResultPlanFilterValue v-for="value in oneField.values" class="mr-half mb-half" :value="value"/>
            </template>
        </div>
    </Flex>
</template>

<style module lang="sass">
.exclude
    flex-shrink: 0
    width: 0.5rem

.field-name
    display: inline-block
    padding: 0 0.25rem
    &:first-child
        min-width: 4em
        text-align: right
</style>
