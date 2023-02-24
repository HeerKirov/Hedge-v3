<script setup lang="ts">
import { LazyLoad } from "@/components/logical"
import { installTopicContext } from "@/services/main/topic"
import TopicListPanel from "./TopicListPanel.vue"
import TopicCreatePanel from "./TopicCreatePanel.vue"
import TopicDetailPanel from "./TopicDetailPanel.vue"

const { paneState } = installTopicContext()

</script>

<template>
    <LazyLoad :visible="!paneState.opened.value" v-slot="{ visible }">
        <TopicListPanel v-show="visible"/>
    </LazyLoad>
    <TopicDetailPanel v-if="paneState.mode.value === 'detail'"/>
    <TopicCreatePanel v-else-if="paneState.mode.value === 'create'"/>
</template>
