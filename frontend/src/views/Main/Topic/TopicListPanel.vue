<script setup lang="ts">
import { Button } from "@/components/universal"
import { VirtualRowView } from "@/components/data"
import { TopBarLayout, MiddleLayout } from "@/components/layout"
import { SearchInput, DataRouter, AttachFilter, AttachTemplate } from "@/components-business/top-bar"
import { Annotation } from "@/functions/http-client/api/annotations"
import { DetailTopic, Topic } from "@/functions/http-client/api/topic"
import { TOPIC_TYPE_ICONS, TOPIC_TYPE_NAMES, TOPIC_TYPES_WITHOUT_UNKNOWN } from "@/constants/entity"
import { useTopicContext } from "@/services/main/topic"
import TopicListPanelItem from "./TopicListPanelItem.vue"

const { paneState, listview: { queryFilter, paginationData, popupMenu, toggleFavorite } } = useTopicContext()

const attachFilterTemplates: AttachTemplate[] = [
    {
        type: "radio",
        field: "type",
        options: TOPIC_TYPES_WITHOUT_UNKNOWN.map(t => ({label: TOPIC_TYPE_NAMES[t], value: t, icon: TOPIC_TYPE_ICONS[t]}))
    },
    {type: "separator"},
    {
        type: "checkbox",
        field: "favorite",
        label: "收藏",
        color: "danger",
        icon: "heart"
    },
    {type: "separator"},
    {
        type: "search",
        field: "parentId",
        label: "选择父主题…",
        multiSelection: false,
        query: client => (offset, limit, search) => client.topic.list({offset, limit, query: search, order: "-updateTime"}),
        queryOne: client => id => client.topic.get(id),
        mapQuery: (item: Topic) => ({label: item.name, value: item.id}),
        mapQueryOne: (item: DetailTopic) => ({label: item.name, value: item.id}),
        history: {
            list: client => client.searchUtil.history.topics,
            push: client => item => client.searchUtil.history.push({type: "TOPIC", id: item.value as number}),
            mapList: (item: Topic) => ({label: item.name, value: item.id})
        },
        displayStyle: "tag"
    },
    {
        type: "search",
        field: "annotationIds",
        label: "选择注解…",
        multiSelection: true,
        query: client => (offset, limit, search) => client.annotation.list({type: "TOPIC", offset, limit, query: search}),
        queryOne: client => id => client.annotation.get(id),
        mapQuery: (item: Annotation) => ({label: item.name, value: item.id}),
        mapQueryOne: (item: Annotation) => ({label: item.name, value: item.id}),
        history: {
            list: client => client.searchUtil.history.annotations,
            push: client => item => client.searchUtil.history.push({type: "ANNOTATION", id: item.value as number}),
            mapList: (item: Annotation) => ({label: item.name, value: item.id})
        },
        displayStyle: "annotation"
    },
    {type: "separator"},
    {
        type: "order",
        items: [
            {label: "按名称", value: "name"},
            {label: "按评分", value: "score"},
            {label: "按项目数量", value: "count"},
            {label: "按创建顺序", value: "createTime"},
            {label: "按修改顺序", value: "updateTime"}
        ],
        defaultValue: "updateTime",
        defaultDirection: "descending"
    }
]

</script>

<template>
    <TopBarLayout>
        <template #top-bar>
            <MiddleLayout>
                <SearchInput placeholder="在此处搜索" v-model:value="queryFilter.query"/>
                <AttachFilter class="ml-1" :templates="attachFilterTemplates" v-model:value="queryFilter"/>

                <template #right>
                    <DataRouter/>
                    <Button icon="plus" square @click="paneState.createView()"/>
                </template>
            </MiddleLayout>
        </template>

        <VirtualRowView :row-height="44" :padding="6" :buffer-size="10" v-bind="paginationData.data.metrics" @update="paginationData.dataUpdate">
            <TopicListPanelItem v-for="item in paginationData.data.result" :key="item.id"
                                :item="item"
                                @update:favorite="toggleFavorite(item.id, $event)"
                                @click="paneState.detailView(item.id)"
                                @contextmenu="popupMenu.popup(item.id)"/>
        </VirtualRowView>
    </TopBarLayout>
</template>
