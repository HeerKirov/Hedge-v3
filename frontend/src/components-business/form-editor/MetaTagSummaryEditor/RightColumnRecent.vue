<script setup lang="ts">
import { Select } from "@/components/form"
import { useEditorContext, useRecentData } from "./context"
import MetaTagCheckList from "./MetaTagCheckList.vue"

const { typeFilter, form: { addAll } } = useEditorContext()
const { selected, selectList, selectedMetaTags } = useRecentData()

</script>

<template>
    <div class="mx-1">
        <Select size="small" :items="selectList" v-model:value="selected"/>
    </div>
    <MetaTagCheckList :tag-filter="typeFilter.tag"
                      :author-filter="typeFilter.author"
                      :topic-filter="typeFilter.topic"
                      :topics="selectedMetaTags.topics"
                      :tags="selectedMetaTags.tags"
                      :authors="selectedMetaTags.authors"
                      @add="addAll"/>
</template>
