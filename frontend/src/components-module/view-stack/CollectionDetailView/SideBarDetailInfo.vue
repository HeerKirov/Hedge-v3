<script setup lang="ts">
import { Icon, Separator } from "@/components/universal"
import { FormEditKit } from "@/components/interaction"
import { ScoreEditor, DescriptionEditor } from "@/components-business/form-editor"
import {
    ScoreDisplay, DescriptionDisplay, MetaTagListDisplay,
    TagmeInfo, PartitionTimeDisplay, TimeGroupDisplay
} from "@/components-business/form-display"
import { useSideBarDetailInfo } from "@/services/view-stack/collection"

const { data, id, setScore, setDescription, openMetaTagEditor } = useSideBarDetailInfo()

</script>

<template>
    <p class="mb-1">
        <Icon icon="id-card"/><b class="ml-1 is-font-size-large selectable">{{id}}</b>
    </p>
    <template v-if="data !== null">
        <Separator direction="horizontal"/>
        <FormEditKit class="mt-2" :value="data.score" :set-value="setScore">
            <template #default="{ value }">
                <ScoreDisplay :value="value"/>
            </template>
            <template #edit="{ value, setValue }">
                <ScoreEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>
        <FormEditKit class="mt-2" :value="data.description" :set-value="setDescription">
            <template #default="{ value }">
                <DescriptionDisplay :value="value"/>
            </template>
            <template #edit="{ value, setValue }">
                <DescriptionEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>
        <TagmeInfo v-if="data.tagme.length > 0" class="mt-1" :value="data.tagme"/>
        <MetaTagListDisplay class="mt-2" :topics="data.topics" :authors="data.authors" :tags="data.tags" @dblclick="openMetaTagEditor"/>
        <PartitionTimeDisplay :partition-time="data.partitionTime"/>
        <TimeGroupDisplay :order-time="data.orderTime" :update-time="data.updateTime" :create-time="data.createTime"/>
    </template>
</template>
