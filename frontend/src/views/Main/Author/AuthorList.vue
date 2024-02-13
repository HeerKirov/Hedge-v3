<script setup lang="ts">
import { Button, Separator } from "@/components/universal"
import { VirtualRowView } from "@/components/data"
import { BrowserTeleport } from "@/components/logical"
import { SearchBox, DataRouter, AttachFilter, AttachTemplate } from "@/components-business/top-bar"
import { Author } from "@/functions/http-client/api/author"
import { Annotation } from "@/functions/http-client/api/annotations"
import { AUTHOR_TYPE_ICONS, AUTHOR_TYPE_NAMES, AUTHOR_TYPES_WITHOUT_UNKNOWN } from "@/constants/entity"
import { installAuthorContext } from "@/services/main/author"
import { usePopupMenu } from "@/modules/popup-menu"
import AuthorListItem from "./AuthorListItem.vue"

const {
    listview: { queryFilter, paginationData: { data, state, setState, navigateTo } },
    operators: { openCreateView, openDetailView, toggleFavorite, createByTemplate, deleteItem, findSimilarOfAuthor, openIllustsOfAuthor }
} = installAuthorContext()

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
            list: client => (_: number) => client.searchUtil.history.annotations("AUTHOR"),
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

const popupMenu = usePopupMenu<Author>([
    {type: "normal", label: "查看详情", click: a => openDetailView(a.id)},
    {type: "separator"},
    {type: "normal", label: "以此为模板新建", click: createByTemplate},
    {type: "separator"},
    {type: "normal", label: "在图库查看此作者的所有项目", click: openIllustsOfAuthor},
    {type: "normal", label: "在此作者范围内查找相似项", click: findSimilarOfAuthor},
    {type: "separator"},
    {type: "normal", label: "删除此作者", click: deleteItem},
])

</script>

<template>
    <BrowserTeleport to="top-bar">
        <SearchBox placeholder="在此处搜索" v-model:value="queryFilter.query"/>
        <AttachFilter class="ml-1" :templates="attachFilterTemplates" v-model:value="queryFilter"/>
        <Separator/>
        <DataRouter :state="state" @navigate="navigateTo"/>
        <Button class="flex-item no-grow-shrink" icon="plus" square @click="openCreateView"/>
    </BrowserTeleport>

    <VirtualRowView :row-height="80" :padding="6" :metrics="data.metrics" :state="state" @update:state="setState">
        <AuthorListItem v-for="item in data.items" :key="item.id" :item="item"
                        @update:favorite="toggleFavorite(item, $event)"
                        @click="openDetailView(item.id)"
                        @contextmenu="popupMenu.popup(item)"/>
    </VirtualRowView>
</template>
