<script setup lang="ts">
import { Button } from "@/components/universal"
import { TopBarLayout, MiddleLayout } from "@/components/layout"
import { SearchInput, QueryNotificationBadge, QueryResult, CollectionModeButton } from "@/components-business/top-bar"
import { usePartitionContext } from "@/services/main/partition"
import PartitionViewCalendar from "./PartitionViewCalendar.vue"
import PartitionViewTimeline from "./PartitionViewTimeline.vue"

const {
    partition: { viewMode },
    querySchema, listviewController: { collectionMode }
} = usePartitionContext()

</script>

<template>
    <TopBarLayout :expanded="querySchema.expanded.value">
        <template #top-bar>
            <MiddleLayout>
                <template #left>
                    <span class="ml-2 is-font-size-large">{{viewMode === "calendar" ? "日历" : "时间线"}}</span>
                </template>

                <CollectionModeButton class="mr-1" v-model:value="collectionMode"/>
                <SearchInput placeholder="在此处搜索" v-model:value="querySchema.queryInputText.value" :enable-drop-button="!!querySchema.query.value" v-model:active-drop-button="querySchema.expanded.value"/>
                <QueryNotificationBadge class="ml-1" :schema="querySchema.schema.value" @click="querySchema.expanded.value = true"/>

                <template #right>
                    <Button :type="viewMode === 'timeline' ? 'primary' : undefined" square icon="sort-amount-down" @click="viewMode = 'timeline'"/>
                    <Button :type="viewMode === 'calendar' ? 'primary' : undefined" square icon="calendar" @click="viewMode = 'calendar'"/>
                </template>
            </MiddleLayout>
        </template>

        <template #expand>
            <QueryResult :schema="querySchema.schema.value"/>
        </template>

        <PartitionViewCalendar v-if="viewMode === 'calendar'"/>
        <PartitionViewTimeline v-else/>
    </TopBarLayout>
</template>
