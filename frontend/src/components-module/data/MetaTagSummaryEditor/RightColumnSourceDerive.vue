<script setup lang="ts">
import { useEditorContext, useSourceDeriveData } from "./context"
import MappingTagCheckList from "./MappingTagCheckList.vue"

const { typeFilter, identity, form: { addAll } } = useEditorContext()
const { derives, updateSourceTagMapping } = useSourceDeriveData()

</script>

<template>
    <MappingTagCheckList :tag-filter="typeFilter.tag"
                         :author-filter="typeFilter.author"
                         :topic-filter="typeFilter.topic"
                         :primitive-mode="identity?.type === 'ILLUST_LIST'"
                         :mappings="derives" @add="addAll"
                         @update:source-tag-mapping="updateSourceTagMapping"/>
</template>
