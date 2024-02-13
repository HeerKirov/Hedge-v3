<script setup lang="ts">
import { Button, Separator, Tag } from "@/components/universal"
import { BrowserTeleport } from "@/components/logical"
import { CollectionModeButton, SearchBox } from "@/components-business/top-bar"
import { installPartitionContext } from "@/services/main/partition"
import PartitionViewCalendar from "./PartitionViewCalendar.vue"
import PartitionViewTimeline from "./PartitionViewTimeline.vue"

const {
    partition: { viewMode, total },
    querySchema, listviewController: { collectionMode }
} = installPartitionContext()

</script>

<template>
    <BrowserTeleport to="top-bar">
        <CollectionModeButton class="mr-1" v-model:value="collectionMode"/>
        <SearchBox placeholder="在此处搜索" dialect="ILLUST" v-model:value="querySchema.queryInputText.value" :schema="querySchema.schema.value"/>
        <Separator/>
        <div class="mr-1 ml-1 flex-item align-center no-grow-shrink">
            <Tag>{{ total.count }}项</Tag>
            /
            <Tag>{{ total.day }}天</Tag>
        </div>
        <Button class="flex-item no-grow-shrink" :type="viewMode === 'timeline' ? 'primary' : undefined" square icon="sort-amount-down" @click="viewMode = 'timeline'"/>
        <Button class="flex-item no-grow-shrink" :type="viewMode === 'calendar' ? 'primary' : undefined" square icon="calendar" @click="viewMode = 'calendar'"/>
    </BrowserTeleport>

    <PartitionViewCalendar v-if="viewMode === 'calendar'"/>
    <PartitionViewTimeline v-else/>
</template>
