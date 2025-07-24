<script setup lang="ts">
import { computed } from "vue"
import { Button, Separator } from "@/components/universal"
import { VirtualRowView } from "@/components/data"
import { BrowserTeleport } from "@/components/logical"
import { DataRouter, AttachFilter, AttachTemplate, SearchBox } from "@/components-business/top-bar"
import { DetailTopic, Topic } from "@/functions/http-client/api/topic"
import { TOPIC_TYPE_ICONS, TOPIC_TYPE_NAMES, TOPIC_TYPES_WITHOUT_UNKNOWN } from "@/constants/entity"
import { useTopicContext } from "@/services/main/topic"
import { usePopupMenu } from "@/modules/popup-menu"
import TopicListItem from "./TopicListItem.vue"

const {
    listview: { queryFilter, paginationData: { data, state, setState, navigateTo } },
    operators: { openCreateView, openDetailView, toggleFavorite, deleteItem, createByTemplate, createChildOfTemplate, findSimilarOfTopic, openIllustsOfTopic }
} = useTopicContext()

const query = computed({
    get: () => queryFilter.value.query,
    set: value => queryFilter.value = {...queryFilter.value, query: value}
})

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
    {type: "normal", label: "查看详情", click: t => openDetailView(t.id)},
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
    <BrowserTeleport to="top-bar">
        <SearchBox placeholder="在此处搜索" dialect="TOPIC" v-model:value="query"/>
        <AttachFilter class="ml-1" :templates="attachFilterTemplates" v-model:value="queryFilter"/>
        <Separator/>
        <DataRouter :state="state" @navigate="navigateTo"/>
        <Button class="flex-item no-grow-shrink" icon="plus" square @click="openCreateView"/>
    </BrowserTeleport>

    <VirtualRowView :row-height="44" :padding="6" :buffer-size="10" :metrics="data.metrics" :state="state" @update:state="setState">
        <TopicListItem v-for="item in data.items" :key="item.id" :item="item"
                       @update:favorite="toggleFavorite(item, $event)"
                       @click="openDetailView(item.id)"
                       @contextmenu="popupMenu.popup(item)"/>
    </VirtualRowView>
</template>
