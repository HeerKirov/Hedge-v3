<script setup lang="ts">
import { Flex } from "@/components/layout"
import { ElementGroup, ElementValue } from "@/functions/http-client/api/util-query"
import { QUERY_ELEMENT_TYPES } from "@/constants/translate"
import { useCalloutService } from "@/components-module/callout"
import QueryResultPlanElementValue from "./QueryResultPlanElementValue.vue"

defineProps<{
    elementGroup: ElementGroup
}>()

const callout = useCalloutService()

const click = (e: MouseEvent, value: ElementValue) => {
    if(value.type === "tag" || value.type === "topic" || value.type === "author") {
        callout.show({callout: "metaTag", base: (e.target as HTMLElement).getBoundingClientRect(), metaType: value.type, metaId: value.id})
    }
}

</script>

<template>
    <Flex>
        <div :class="$style['element-type']"><b>{{QUERY_ELEMENT_TYPES[elementGroup.type]}}</b></div>
        <div>
            <template v-for="(intersectItem, idx) in elementGroup.intersectItems">
                <b v-if="idx > 0" class="ml-half mr-1">&</b>
                <b v-if="intersectItem.exclude" class="mr-half">-</b>
                <QueryResultPlanElementValue v-for="unionItem in intersectItem.unionItems" class="mr-half mb-half" :value="unionItem as ElementValue" @click="click($event, unionItem as ElementValue)"/>
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
