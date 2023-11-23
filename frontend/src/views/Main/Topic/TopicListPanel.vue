<script setup lang="ts">
import { Button } from "@/components/universal"
import { VirtualRowView } from "@/components/data"
import { TopBarLayout, MiddleLayout } from "@/components/layout"
import { SearchInput, DataRouter, AttachFilter, AttachTemplate } from "@/components-business/top-bar"
import { Annotation } from "@/functions/http-client/api/annotations"
import { DetailTopic, Topic } from "@/functions/http-client/api/topic"
import { TOPIC_TYPE_ICONS, TOPIC_TYPE_NAMES, TOPIC_TYPES_WITHOUT_UNKNOWN } from "@/constants/entity"
import { useTopicContext } from "@/services/main/topic"
import { usePopupMenu } from "@/modules/popup-menu"
import TopicListPanelItem from "./TopicListPanelItem.vue"

const {
    paneState,
    listview: { queryFilter, paginationData },
    operators: { toggleFavorite, deleteItem, createByTemplate, createChildOfTemplate, findSimilarOfTopic, openIllustsOfTopic }
} = useTopicContext()

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

const popupMenu = usePopupMenu<Topic>([
    {type: "normal", label: "查看详情", click: t => paneState.openDetailView(t.id)},
    {type: "separator"},
    {type: "normal", label: "以此为父主题新建", click: createChildOfTemplate},
    {type: "normal", label: "以此为模板新建", click: createByTemplate},
    {type: "separator"},
    {type: "normal", label: "在图库查看此主题的所有项目", click: openIllustsOfTopic},
    {type: "normal", label: "在此主题范围内查找相似项", click: findSimilarOfTopic},
    {type: "separator"},
    {type: "normal", label: "删除此主题", click: deleteItem},
])

</script>

<template>
    <TopBarLayout>
        <template #top-bar>
            <MiddleLayout>
                <SearchInput placeholder="在此处搜索" v-model:value="queryFilter.query"/>
                <AttachFilter class="ml-1" :templates="attachFilterTemplates" v-model:value="queryFilter"/>

                <template #right>
                    <DataRouter/>
                    <Button icon="plus" square @click="paneState.openCreateView()"/>
                </template>
            </MiddleLayout>
        </template>

        <VirtualRowView :row-height="44" :padding="6" :buffer-size="10" v-bind="paginationData.data.metrics" @update="paginationData.dataUpdate">
            <TopicListPanelItem v-for="item in paginationData.data.result" :key="item.id"
                                :item="item"
                                @update:favorite="toggleFavorite(item, $event)"
                                @click="paneState.openDetailView(item.id)"
                                @contextmenu="popupMenu.popup(item)"/>
        </VirtualRowView>
    </TopBarLayout>
</template>
