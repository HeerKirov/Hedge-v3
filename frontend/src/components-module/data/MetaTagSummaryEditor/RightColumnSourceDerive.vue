<script setup lang="ts">
import { useEditorContext, useSourceDeriveData } from "./context"
import MappingTagCheckList from "./MappingTagCheckList.vue"

const { typeFilter, form: { addAll } } = useEditorContext()
const { sourceSite, derives, updateSourceTagMapping } = useSourceDeriveData()

</script>

<template>
    <MappingTagCheckList :tag-filter="typeFilter.tag"
                         :author-filter="typeFilter.author"
                         :topic-filter="typeFilter.topic"
                         :mappings="derives" @add="addAll"
                         @update:source-tag-mapping="updateSourceTagMapping"/>
</template>
