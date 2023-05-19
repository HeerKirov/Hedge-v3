<script setup lang="ts">
import { toRef } from "vue"
import { ThumbnailImage, Separator } from "@/components/universal"
import { FormEditKit } from "@/components/interaction"
import { SourceInfo, TagmeInfo, SourcePreferencesDisplay } from "@/components-business/form-display"
import { SourceIdentityEditor, TagmeEditor, DateEditor, DateTimeEditor } from "@/components-business/form-editor"
import { date, datetime } from "@/utils/datetime"
import { useImportDetailPaneSingle } from "@/services/main/import"

const props = defineProps<{
    detailId: number
}>()

const path = toRef(props, "detailId")

const { data, setTagme, setSourceInfo, setCreateTime, setOrderTime, setPartitionTime, clearAllPreferences } = useImportDetailPaneSingle(path)

</script>

<template>
    <ThumbnailImage minHeight="12rem" maxHeight="40rem" :file="data?.thumbnailFile"/>
    <template v-if="!!data">
        <p v-if="data.fileName" class="selectable word-wrap-anywhere mb-1">{{data.fileName}}</p>
        <p v-if="data.fileCreateTime" class="secondary-text">文件创建时间 {{datetime.toSimpleFormat(data.fileCreateTime)}}</p>
        <p v-if="data.fileUpdateTime" class="secondary-text">文件修改时间 {{datetime.toSimpleFormat(data.fileUpdateTime)}}</p>
        <p v-if="data.fileImportTime" class="secondary-text">文件导入时间 {{datetime.toSimpleFormat(data.fileImportTime)}}</p>
        <Separator direction="horizontal"/>
        <FormEditKit class="mt-1" :value="{site: data.sourceSite, sourceId: data.sourceId, sourcePart: data.sourcePart}" :set-value="setSourceInfo">
            <template #default="{ value: {site, sourceId, sourcePart} }">
                <SourceInfo :site="site" :source-id="sourceId" :source-part="sourcePart"/>
            </template>
            <template #edit="{ value: {site, sourceId, sourcePart}, setValue }">
                <SourceIdentityEditor :site="site" :source-id="sourceId" :source-part="sourcePart" @update="setValue"/>
            </template>
        </FormEditKit>
        <FormEditKit class="mt-1" :value="data.tagme" :set-value="setTagme">
            <template #default="{ value }">
                <TagmeInfo :value="value"/>
            </template>
            <template #edit="{ value, setValue }">
                <TagmeEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>
        <SourcePreferencesDisplay class="mt-2" :book-ids="data.bookIds.map(i => i.id)" :preference="data.preference" :collection-id="data.collectionId" @clear="clearAllPreferences"/>
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
