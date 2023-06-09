<script setup lang="ts">
import { Icon, WrappedText } from "@/components/universal"
import { ScoreDisplay, TagmeInfo, MetaTagListDisplay, PartitionTimeDisplay, TimeGroupDisplay } from "@/components-business/form-display"
import { FindSimilarCompareData } from "@/services/main/find-similar"

defineProps<{
    values: (FindSimilarCompareData["metadata"] | null)[]
}>()

</script>

<template>
    <tr>
        <td>ID</td>
        <td v-for="value in values">
            <template v-if="value !== null">
                <Icon :icon="value.file !== null ? 'plus-square' : 'id-card'"/>
                <b class="ml-1 is-font-size-large selectable">{{value.id}}</b>
                <span v-if="value.file !== null" class="ml-1">
                    (<i class="selectable no-wrap overflow-ellipsis">{{value.file}}</i>)
                </span>
            </template>
        </td>
    </tr>
    <tr v-if="values.some(i => i?.score || i?.favorite)">
        <td>评分/收藏</td>
        <td v-for="value in values">
            <ScoreDisplay v-if="value !== null" class="is-inline-block" :value="value.score"/>
            <Icon v-if="value?.favorite" class="has-text-danger ml-2" icon="heart"/>
        </td>
    </tr>
    <tr v-if="values.some(i => i?.description)">
        <td>描述</td>
        <td v-for="value in values">
            <WrappedText v-if="value !== null" :value="value.description"/>
        </td>
    </tr>
    <tr v-if="values.some(i => i?.tagme.length)">
        <td>Tagme</td>
        <td v-for="value in values">
            <TagmeInfo v-if="value !== null" class="is-inline-block" :value="value.tagme"/>
        </td>
    </tr>
    <tr v-if="values.some(i => i?.tags.length || i?.topics.length || i?.authors.length)">
        <td>标签</td>
        <td v-for="value in values">
            <MetaTagListDisplay v-if="value !== null" :max="5" :tags="value.tags" :topics="value.topics" :authors="value.authors" direction="horizontal"/>
        </td>
    </tr>
    <tr v-if="values.some(i => !!i)">
        <td>时间</td>
        <td v-for="value in values">
            <template v-if="value !== null">
                <PartitionTimeDisplay v-if="value.partitionTime !== null" :partition-time="value.partitionTime"/>
                <TimeGroupDisplay :create-time="value.createTime" :update-time="value.updateTime" :order-time="value.orderTime"/>
            </template>
        </td>
    </tr>
</template>
