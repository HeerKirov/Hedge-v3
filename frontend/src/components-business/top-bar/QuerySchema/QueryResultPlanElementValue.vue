<script setup lang="ts">
import { Tag } from "@/components/universal"
import { ElementAuthor, ElementTag, ElementTopic, ElementValue } from "@/functions/http-client/api/util-query"
import { AnnotationElement, SourceTagElement, SimpleMetaTagElement } from "@/components-business/element"
import type { SimpleAuthor, SimpleTopic, SimpleTag, MetaTagValues } from "@/functions/http-client/api/all"

defineProps<{
    value: ElementValue
}>()

function mapMetaTag(value: ElementTopic | ElementAuthor | ElementTag): MetaTagValues {
    if(value.type === "topic" || value.type === "author") {
        return {id: value.id, name: value.name, color: value.color, type: value.tagType}
    }else{
        return {id: value.id, name: value.name, color: value.color}
    }
}

</script>

<template>
    <AnnotationElement v-if="value.type === 'annotation'" :value="{id: value.id, name: value.name}"/>
    <SourceTagElement v-else-if="value.type === 'source-tag'" :site="value.site" :value="{code: value.code, name: value.name, otherName: null, type: value.type}"/>
    <Tag v-else-if="value.type === undefined">{{value.value}}</Tag>
    <SimpleMetaTagElement v-else :type="value.type" :value="mapMetaTag(value)"/>
</template>
