<script setup lang="ts">
import { MetaTagSummaryEditor } from "@/components-business/form-editor"
import { CommonData, } from "./context"

const props = defineProps<{
    data: CommonData
    allowTagme?: boolean
}>()

const emit = defineEmits<{
    (e: "resolve", data: CommonData | undefined): void
}>()

const update = (form: Partial<CommonData>) => {
    if(form.topics || form.authors || form.tagme || form.tags) {
        emit("resolve", {
            tags: form.tags ?? props.data.tags ?? [],
            topics: form.topics ?? props.data.topics ?? [],
            authors: form.authors ?? props.data.authors ?? [],
            tagme: form.tagme ?? props.data.tagme
        })
    }else{
        emit("resolve", undefined)
    }
}

</script>

<template>
    <MetaTagSummaryEditor :topics="data.topics" :tags="data.tags" :authors="data.authors" :tagme="data.tagme" :allow-tagme="allowTagme" :identity="null" @update="update"/>
</template>
