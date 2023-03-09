<script setup lang="ts">
import { MetaTagTypes } from "@/functions/http-client/api/all"
import TopicDetail from "./TopicDetail.vue"
import AuthorDetail from "./AuthorDetail.vue"
import TagDetail from "./TagDetail.vue"

const props = defineProps<{
    metaType: MetaTagTypes
    metaId: number
}>()

</script>

<template>
    <div :class="$style.root">
        <TopicDetail v-if="metaType === 'topic'" :topic-id="metaId"/>
        <AuthorDetail v-else-if="metaType === 'author'" :author-id="metaId"/>
        <TagDetail v-else :tag-id="metaId"/>
    </div>
</template>

<style module lang="sass">
.root
    overflow-y: auto
    padding: 0.75rem
    max-height: 12rem
</style>
