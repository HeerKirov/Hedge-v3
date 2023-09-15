<script setup lang="ts">
import { toRef } from "vue"
import { ThumbnailImage, Separator } from "@/components/universal"
import { FormEditKit } from "@/components/interaction"
import { SourceInfo, TagmeInfo, ImportPreferencesDisplay, ImportSourcePreferencesDisplay, FileInfoDisplay } from "@/components-business/form-display"
import { SourceIdentityEditor, TagmeEditor, DateEditor, DateTimeEditor } from "@/components-business/form-editor"
import { useImportDetailPaneSingle } from "@/services/main/import"
import { date, datetime } from "@/utils/datetime"

const props = defineProps<{
    detailId: number
}>()

const path = toRef(props, "detailId")

const { data, setTagme, setSourceInfo, setCreateTime, setOrderTime, setPartitionTime, clearAllPreferences, clearAllSourcePreferences, openImagePreview } = useImportDetailPaneSingle(path)

</script>

<template>
    <ThumbnailImage class="is-cursor-zoom-in" minHeight="12rem" maxHeight="40rem" :file="data?.filePath.thumbnail" @click="openImagePreview"/>
    <template v-if="!!data">
        <p v-if="data.originFileName" class="selectable word-wrap-anywhere mb-1">{{data.originFileName}}</p>
        <p v-if="data.fileCreateTime" class="secondary-text mt-2">文件创建时间 {{datetime.toSimpleFormat(data.fileCreateTime)}}</p>
        <p v-if="data.fileUpdateTime" class="secondary-text">文件修改时间 {{datetime.toSimpleFormat(data.fileUpdateTime)}}</p>
        <p v-if="data.fileImportTime" class="secondary-text">文件导入时间 {{datetime.toSimpleFormat(data.fileImportTime)}}</p>
        <FileInfoDisplay class="mt-2" :extension="data.extension" :file-size="data.size" :resolution-height="data.resolutionHeight" :resolution-width="data.resolutionWidth" :video-duration="data.videoDuration"/>
        <Separator direction="horizontal"/>
        <FormEditKit class="mt-1" :value="data.source" :set-value="setSourceInfo">
            <template #default="{ value }">
                <SourceInfo :source="value"/>
            </template>
            <template #edit="{ value, setValue }">
                <SourceIdentityEditor :source="value" @update:source="setValue"/>
            </template>
        </FormEditKit>
        <ImportSourcePreferencesDisplay class="mt-1" :preference="data.sourcePreference" :site="data.source?.sourceSite ?? null" @clear="clearAllSourcePreferences"/>
        <Separator direction="horizontal"/>
        <FormEditKit class="mt-1" :value="data.tagme" :set-value="setTagme">
            <template #default="{ value }">
                <TagmeInfo :value="value"/>
            </template>
            <template #edit="{ value, setValue }">
                <TagmeEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>
        <ImportPreferencesDisplay class="mt-2" :book-ids="data.books.map(i => i.id)" :preference="data.preference" :collection-id="data.collectionId" @clear="clearAllPreferences"/>
        <FormEditKit class="mt-2" :value="data.partitionTime" :set-value="setPartitionTime">
            <template #default="{ value }">
                <p class="secondary-text">时间分区 {{date.toISOString(value)}}</p>
            </template>
            <template #edit="{ value, setValue }">
                <DateEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>
        <FormEditKit :value="data.createTime" :set-value="setCreateTime">
            <template #default="{ value }">
                <p class="secondary-text">创建时间 {{datetime.toSimpleFormat(value)}}</p>
            </template>
            <template #edit="{ value, setValue }">
                <DateTimeEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>
        <FormEditKit :value="data.orderTime" :set-value="setOrderTime">
            <template #default="{ value }">
                <p class="secondary-text">排序时间 {{datetime.toSimpleFormat(value)}}</p>
            </template>
            <template #edit="{ value, setValue }">
                <DateTimeEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>
    </template>
</template>
