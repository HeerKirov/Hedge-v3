<script setup lang="ts">
import { Icon, Starlight, WrappedText } from "@/components/universal"
import { TagmeInfo, MetaTagListDisplay, PartitionTimeDisplay, FileInfoDisplay } from "@/components-business/form-display"
import { ImageData } from "./context"

defineProps<{
    values: (ImageData["metadata"] | null)[]
}>()

</script>

<template>
    <tr>
        <td>ID</td>
        <td v-for="value in values">
            <template v-if="value !== null">
                <Icon icon="id-card"/><b class="ml-1 is-font-size-large selectable">{{value.id}}</b>
            </template>
        </td>
    </tr>
    <tr>
        <td>文件信息</td>
        <td v-for="value in values">
            <FileInfoDisplay v-if="value !== null" mode="inline" :extension="value.extension" :file-size="value.size" :resolution-width="value.resolutionWidth" :resolution-height="value.resolutionHeight" :video-duration="value.videoDuration"/>
        </td>
    </tr>
    <tr v-if="values.some(i => i?.score || i?.favorite)">
        <td>评分/收藏</td>
        <td v-for="value in values">
            <Starlight v-if="value !== null" :value="value.score"/>
            <Icon v-if="value?.favorite" class="has-text-danger ml-2" icon="heart"/>
        </td>
    </tr>
    <tr v-if="values.some(i => i?.description)">
        <td>描述</td>
        <td v-for="value in values">
            <WrappedText v-if="value !== null" :value="value.description"/>
        </td>
    </tr>
    <tr v-if="values.some(i => i?.tags.some(i => i.isExported !== 'FROM_RELATED') || i?.topics.some(i => i.isExported !== 'FROM_RELATED') || i?.authors.some(i => i.isExported !== 'FROM_RELATED'))">
        <td>标签</td>
        <td v-for="value in values">
            <MetaTagListDisplay v-if="value !== null" :max="5" :tags="value.tags" :topics="value.topics" :authors="value.authors" self-is="IMAGE" category="self" direction="horizontal"/>
        </td>
    </tr>
    <tr v-if="values.some(i => i?.tagme.length)">
        <td>Tagme</td>
        <td v-for="value in values">
            <TagmeInfo v-if="value !== null" class="is-inline-block" :value="value.tagme"/>
        </td>
    </tr>
    <tr v-if="values.some(i => !!i)">
        <td>时间</td>
        <td v-for="value in values">
            <PartitionTimeDisplay v-if="value !== null && value.partitionTime !== null" :partition-time="value.partitionTime" :order-time="value.orderTime" :create-time="value.createTime" :update-time="value.updateTime"/>
        </td>
    </tr>
</template>
