<script setup lang="ts">
import { Icon } from "@/components/universal"
import { SimpleMetaTagElement } from "@/components-business/element"
import { SimpleAuthor, SimpleTag, SimpleTopic } from "@/functions/http-client/api/all"

defineProps<{
    authors: SimpleAuthor[]
    topics: SimpleTopic[]
    tags: SimpleTag[]
}>()

//TODO 左键打开callout & 右键菜单功能

</script>

<template>
    <div v-if="tags.length || authors.length || topics.length">
        <SimpleMetaTagElement v-for="author in authors" class="mt-1" type="author" :value="author" wrapped-by-div/>
        <SimpleMetaTagElement v-for="topic in topics" class="mt-1" type="topic" :value="topic" wrapped-by-div/>
        <SimpleMetaTagElement v-for="tag in tags" class="mt-1" type="tag" :value="tag" wrapped-by-div/>
    </div>
    <div v-else class="has-text-secondary">
        <Icon icon="tag"/>
        <i>没有元数据标签</i>
    </div>
</template>
