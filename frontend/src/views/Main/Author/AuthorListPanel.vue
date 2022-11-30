<script setup lang="ts">
import { Button } from "@/components/universal"
import { VirtualRowView } from "@/components/data"
import { TopBarLayout, MiddleLayout } from "@/components/layout"
import { SearchInput, DataRouter, AttachFilter, AttachTemplate } from "@/components-business/top-bar"
import { Annotation } from "@/functions/http-client/api/annotations"
import { DetailAuthor, Author } from "@/functions/http-client/api/author"
import { AUTHOR_TYPE_ICONS, AUTHOR_TYPE_NAMES, AUTHOR_TYPES_WITHOUT_UNKNOWN } from "@/constants/entity"
import { useAuthorContext } from "@/services/main/author"
import AuthorListPanelItem from "./AuthorListPanelItem.vue"

const { paneState, listview: { queryFilter, paginationData, popupMenu, toggleFavorite } } = useAuthorContext()

const attachFilterTemplates: AttachTemplate[] = [
    {
        type: "radio",
        field: "type",
        options: AUTHOR_TYPES_WITHOUT_UNKNOWN.map(t => ({label: AUTHOR_TYPE_NAMES[t], value: t, icon: AUTHOR_TYPE_ICONS[t]}))
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
        field: "annotationIds",
        label: "选择注解…",
        multiSelection: true,
        query: client => (offset, limit, search) => client.annotation.list({type: "AUTHOR", offset, limit, query: search}),
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

        <VirtualRowView :row-height="80" :padding="6" :buffer-size="8" v-bind="paginationData.data.metrics" @update="paginationData.dataUpdate">
            <AuthorListPanelItem v-for="item in paginationData.data.result" :key="item.id"
                                :item="item"
                                @update:favorite="toggleFavorite(item.id, $event)"
                                @click="paneState.detailView(item.id)"
                                @contextmenu="popupMenu.popup(item.id)"/>
        </VirtualRowView>
    </TopBarLayout>
</template>
