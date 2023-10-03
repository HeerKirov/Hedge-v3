<script setup lang="ts">
import { BasePane } from "@/components/layout"
import { ThumbnailImage } from "@/components/universal"
import { useBookDetailPane } from "@/services/main/book"
import BookTabDetailInfo from "./BookTabDetailInfo.vue"

defineEmits<{
    (e: "close"): void
}>()

const { data } = useBookDetailPane()

</script>

<template>
    <BasePane @close="$emit('close')">
        <template #top>
            <ThumbnailImage :aspect="1" :file="data?.filePath?.thumbnail" :draggable-file="data?.filePath?.original" :drag-icon-file="data?.filePath?.sample"/>
        </template>

        <BookTabDetailInfo :book="data"/>
    </BasePane>
</template>
