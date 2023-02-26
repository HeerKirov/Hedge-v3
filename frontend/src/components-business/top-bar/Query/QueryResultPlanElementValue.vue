<script setup lang="ts">
import { Tag } from "@/components/universal"
import { ElementValue } from "@/functions/http-client/api/util-query"
import { AnnotationElement, SourceTagElement, SimpleMetaTagElement } from "@/components-business/element"
import type { SimpleAuthor, SimpleTopic, SimpleTag } from "@/functions/http-client/api/all"

defineProps<{
    value: ElementValue
}>()

</script>

<template>
    <AnnotationElement v-if="value.type === 'annotation'" :value="{id: value.id, name: value.name}"/>
    <SourceTagElement v-else-if="value.type === 'source-tag'" :value="{code: '', name: value.name, otherName: null, type: null}"/>
    <Tag v-else-if="value.type === undefined">{{value.name}}</Tag>
    <SimpleMetaTagElement v-else :type="value.type" :value="value as (SimpleAuthor | SimpleTag | SimpleTopic)"/>
</template>
