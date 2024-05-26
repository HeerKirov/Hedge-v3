<script setup lang="ts">
import { toRef } from "vue"
import { FormEditKit } from "@/components/interaction"
import { Separator, Icon } from "@/components/universal"
import { TagmeInfo, DescriptionDisplay, PartitionTimeDisplay, MetaTagListDisplay, FileInfoDisplay } from "@/components-business/form-display"
import { DateEditor, DateTimeEditor, ScoreEditor } from "@/components-business/form-editor"
import { DescriptionEditor } from "@/components-business/form-editor"
import { useSideBarDetailInfo } from "@/services/main/illust"

const props = defineProps<{
    detailId: number
    isCollectionDetail?: boolean
}>()

const detailId = toRef(props, "detailId")

const { data, setScore, setDescription, openMetaTagEditor, setTime } = useSideBarDetailInfo(detailId)

</script>

<template>
    <template v-if="!!data">
        <p class="my-1">
            <Icon icon="id-card"/><b class="ml-1 selectable">{{ data.id }}</b>
            <span v-if="data.type === 'COLLECTION'" class="float-right"><Icon class="mr-1" icon="images"/>{{ data.childrenCount }}项</span>
        </p>
        <Separator direction="horizontal"/>
        <ScoreEditor :value="data.score" @update:value="setScore" :exported="data.originScore === null"/>
        <FormEditKit class="mt-1" :value="data.description" :set-value="setDescription">
            <template #default="{ value }">
                <DescriptionDisplay :value="value" :exported="!data.originDescription"/>
            </template>
            <template #edit="{ value, setValue }">
                <DescriptionEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>
        <TagmeInfo v-if="data.tagme.length > 0" class="mt-1" :value="data.tagme"/>
        <MetaTagListDisplay class="my-2" :topics="data.topics" :authors="data.authors" :tags="data.tags" @dblclick="openMetaTagEditor"/>
        <FileInfoDisplay v-if="!isCollectionDetail" class="mt-3" :extension="data.extension" :file-size="data.size" :resolution-height="data.resolutionHeight" :resolution-width="data.resolutionWidth" :video-duration="data.videoDuration"/>
        <FormEditKit class="mt-2" :value="{partitionTime: data.partitionTime, orderTime: data.orderTime}" :set-value="setTime">
            <template #default="{ value }">
                <PartitionTimeDisplay :partition-time="value.partitionTime" :order-time="value.orderTime" :create-time="data.createTime" :update-time="data.updateTime"/>
            </template>
            <template #edit="{ value, setValue, save }">
                <label><Icon class="mr-2" icon="clock"/><b>时间分区</b></label>
                <DateEditor auto-focus :value="value.partitionTime" @update:value="setValue({partitionTime: $event, orderTime: value.orderTime})" @enter="save"/>
                <label><Icon class="mr-2" icon="business-time"/><b>排序时间</b></label>
                <DateTimeEditor auto-focus :value="value.orderTime" @update:value="setValue({partitionTime: value.partitionTime, orderTime: $event})" @enter="save"/>
            </template>
        </FormEditKit>
    </template>
</template>
