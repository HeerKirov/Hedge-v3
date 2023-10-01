<script setup lang="ts">
import { toRef } from "vue"
import { FormEditKit } from "@/components/interaction"
import { Separator, Icon } from "@/components/universal"
import { TagmeInfo, DescriptionDisplay, PartitionTimeDisplay, TimeGroupDisplay, ScoreDisplay, MetaTagListDisplay, FileInfoDisplay } from "@/components-business/form-display"
import { DateEditor, DateTimeEditor } from "@/components-business/form-editor"
import { DescriptionEditor, ScoreEditor } from "@/components-business/form-editor"
import { useSideBarDetailInfo } from "@/services/main/illust"

const props = defineProps<{detailId: number}>()

const detailId = toRef(props, "detailId")

const { data, setScore, setDescription, openMetaTagEditor, setPartitionTime, setOrderTime } = useSideBarDetailInfo(detailId)

</script>

<template>
    <template v-if="!!data">
        <p class="my-1">
            <Icon icon="id-card"/><b class="ml-1 is-font-size-large selectable">{{ data.id }}</b>
            <span v-if="data.type === 'COLLECTION'" class="float-right"><Icon class="mr-1" icon="images"/>{{ data.childrenCount }}项</span>
        </p>
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
        <MetaTagListDisplay class="my-2" :topics="data.topics" :authors="data.authors" :tags="data.tags" @dblclick="openMetaTagEditor"/>
        <FileInfoDisplay v-if="data.type === 'IMAGE'" class="mt-3" :extension="data.extension" :file-size="data.size" :resolution-height="data.resolutionHeight" :resolution-width="data.resolutionWidth" :video-duration="data.videoDuration"/>
        <FormEditKit v-if="data.type === 'IMAGE'" class="mt-2" :value="data.partitionTime" :set-value="setPartitionTime">
            <template #default="{ value }">
                <PartitionTimeDisplay :partition-time="value"/>
            </template>
            <template #edit="{ value, setValue }">
                <DateEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>
        <PartitionTimeDisplay v-else class="mt-2" :partition-time="data.partitionTime"/>
        <FormEditKit v-if="data.type === 'IMAGE'" :value="data.orderTime" :set-value="setOrderTime">
            <template #default="{ value }">
                <TimeGroupDisplay :order-time="value" :update-time="data.updateTime" :create-time="data.createTime"/>
            </template>
            <template #edit="{ value, setValue }">
                <DateTimeEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>
        <TimeGroupDisplay v-else :order-time="data.orderTime" :update-time="data.updateTime" :create-time="data.createTime"/>
    </template>
</template>
