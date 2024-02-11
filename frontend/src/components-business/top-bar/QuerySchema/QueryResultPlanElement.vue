<script setup lang="ts">
import { Flex } from "@/components/layout"
import { ElementGroup, ElementValue } from "@/functions/http-client/api/util-query"
import { QUERY_ELEMENT_TYPES } from "@/constants/translate"
import QueryResultPlanElementValue from "./QueryResultPlanElementValue.vue"

defineProps<{
    elementGroup: ElementGroup
}>()

</script>

<template>
    <Flex>
        <div :class="$style['element-type']"><b>{{QUERY_ELEMENT_TYPES[elementGroup.type]}}</b></div>
        <div>
            <template v-for="(intersectItem, idx) in elementGroup.intersectItems">
                <b v-if="idx > 0" class="ml-half mr-1">&</b>
                <b v-if="intersectItem.exclude" class="mr-half">-</b>
                <QueryResultPlanElementValue v-for="unionItem in intersectItem.unionItems" class="mr-half mb-half" :value="unionItem as ElementValue"/>
            </template>
        </div>
    </Flex>
</template>

<style module lang="sass">
.element-type
    flex-shrink: 0
    width: 4rem
    padding: 0 0.25rem
    text-align: right
</style>
