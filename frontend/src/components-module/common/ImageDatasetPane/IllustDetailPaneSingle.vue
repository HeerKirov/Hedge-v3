<script setup lang="ts">
import { toRef } from "vue"
import { FormEditKit } from "@/components/interaction"
import { ThumbnailImage, Separator, Icon } from "@/components/universal"
import { TagmeInfo, DescriptionDisplay, PartitionTimeDisplay, TimeGroupDisplay, ScoreDisplay, MetaTagListDisplay, FileInfoDisplay } from "@/components-business/form-display"
import { DateEditor, DateTimeEditor } from "@/components-business/form-editor"
import { DescriptionEditor, ScoreEditor } from "@/components-business/form-editor"
import { useIllustDetailPaneSingle } from "@/services/main/illust"

const props = defineProps<{
    detailId: number
}>()

const path = toRef(props, "detailId")

const { data, setDescription, setScore, setOrderTime, setPartitionTime, openMetaTagEditor, openImagePreview } = useIllustDetailPaneSingle(path)

</script>

<template>
    <ThumbnailImage class="is-cursor-zoom-in" minHeight="12rem" maxHeight="40rem" :file="data?.filePath.thumbnail" :draggable-file="data?.filePath.original" :drag-icon-file="data?.filePath.sample" @click="openImagePreview"/>
    <template v-if="!!data">
        <p class="my-1">
            <Icon icon="id-card"/><b class="ml-1 is-font-size-large selectable">{{ path }}</b>
            <span v-if="data.type === 'COLLECTION'" class="float-right"><Icon class="mr-1" icon="images"/>{{ data.childrenCount }}项</span>
        </p>
        <Separator direction="horizontal"/>
        <FormEditKit class="mt-1" :value="data.score" :set-value="setScore">
            <template #default="{ value }">
                <ScoreDisplay :value="value"/>
            </template>
            <template #edit="{ value, setValue }">
                <ScoreEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>
        <FormEditKit class="mt-1" :value="data.description" :set-value="setDescription">
            <template #default="{ value }">
                <DescriptionDisplay :value="value"/>
            </template>
            <template #edit="{ value, setValue }">
                <DescriptionEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>
        <TagmeInfo v-if="data.tagme.length > 0" class="mt-1" :value="data.tagme"/>
        <MetaTagListDisplay class="my-2" :topics="data.topics" :authors="data.authors" :tags="data.tags" @dblclick="openMetaTagEditor"/>
        <FileInfoDisplay v-if="data.type === 'IMAGE'" class="mt-1" :extension="data.extension" :file-size="data.size" :resolution-height="data.resolutionHeight" :resolution-width="data.resolutionWidth" :video-duration="data.videoDuration"/>
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
