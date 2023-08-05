<script setup lang="ts">
import { Icon, Separator } from "@/components/universal"
import { FormEditKit } from "@/components/interaction"
import { ScoreEditor, DescriptionEditor, DateEditor, DateTimeEditor } from "@/components-business/form-editor"
import {
    ScoreDisplay, DescriptionDisplay, MetaTagListDisplay,
    TagmeInfo, PartitionTimeDisplay, TimeGroupDisplay, FileInfoDisplay
} from "@/components-business/form-display"
import { useSideBarDetailInfo } from "@/services/view-stack/image"

const { data, id, setScore, setDescription, openMetaTagEditor, setPartitionTime, setOrderTime } = useSideBarDetailInfo()

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
        <FileInfoDisplay class="mt-3" :extension="data.extension" :file-size="data.size" :resolution-height="data.resolutionWidth" :resolution-width="data.resolutionHeight" :video-duration="data.videoDuration"/>
        <FormEditKit class="mt-2" :value="data.partitionTime" :set-value="setPartitionTime">
            <template #default="{ value }">
                <PartitionTimeDisplay :partition-time="value"/>
            </template>
            <template #edit="{ value, setValue }">
                <DateEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>
        <FormEditKit :value="data.orderTime" :set-value="setOrderTime">
            <template #default="{ value }">
                <TimeGroupDisplay :order-time="value" :update-time="data.updateTime" :create-time="data.createTime"/>
            </template>
            <template #edit="{ value, setValue }">
                <DateTimeEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>
    </template>
</template>
