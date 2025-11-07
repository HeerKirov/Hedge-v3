<script setup lang="ts">
import { ComponentPublicInstance, computed, ref, useTemplateRef } from "vue"
import { Button, Separator } from "@/components/universal"
import { VirtualRowView } from "@/components/data"
import { BrowserTeleport } from "@/components/logical"
import { SearchBox, DataRouter, AttachFilter, AttachTemplate } from "@/components-business/top-bar"
import { Author } from "@/functions/http-client/api/author"
import { AUTHOR_TYPE_ICONS, AUTHOR_TYPE_NAMES, AUTHOR_TYPES_WITHOUT_UNKNOWN } from "@/constants/entity"
import { QUERY_FILTER_ORDER_NAMES } from "@/constants/translate"
import { installAuthorContext } from "@/services/main/author"
import { usePopupMenu } from "@/modules/popup-menu"
import { useElementContainerQuery } from "@/utils/sensors"
import AuthorListItem from "./AuthorListItem.vue"

const {
    listview: { queryFilter, paginationData: { data, state, setState, navigateTo } },
    operators: { openCreateView, openDetailView, toggleFavorite, deleteItem, findSimilarOfAuthor, openIllustsOfAuthor, openBooksOfAuthor }
} = installAuthorContext()

const query = computed({
    get: () => queryFilter.value.query,
    set: value => queryFilter.value = {...queryFilter.value, query: value}
})

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
        type: "order",
        items: Object.entries(QUERY_FILTER_ORDER_NAMES).map(([value, name]) => ({label: `按${name}`, value})),
        defaultValue: "updateTime",
        defaultDirection: "descending"
    }
]

const popupMenu = usePopupMenu<Author>([
    {type: "normal", label: "查看详情", click: a => openDetailView(a.id)},
    {type: "separator"},
    {type: "normal", label: "在图库搜索", click: openIllustsOfAuthor},
    {type: "normal", label: "在画集搜索", click: openBooksOfAuthor},
    {type: "separator"},
    {type: "normal", label: "查找此作者的相似项", click: findSimilarOfAuthor},
    {type: "separator"},
    {type: "normal", label: "删除此作者", click: deleteItem},
])

const viewRef = ref<ComponentPublicInstance>()

//超过3的列数有些过于拥挤。此外，当默认值与第一次触发的值不一致时，由于数据加载基于默认值，可能造成计算的state与实际所需不一致，比如列数超过3时首屏数据不全
const columnCount = useElementContainerQuery(viewRef, {default: 3, base: 1, 600: 2, 1100: 3})

</script>

<template>
    <BrowserTeleport to="top-bar">
        <SearchBox placeholder="在此处搜索" dialect="AUTHOR" v-model:value="query"/>
        <AttachFilter class="ml-1" :templates="attachFilterTemplates" v-model:value="queryFilter"/>
        <Separator/>
        <DataRouter :state="state" @navigate="navigateTo"/>
        <Button class="flex-item no-grow-shrink" icon="plus" square @click="openCreateView"/>
    </BrowserTeleport>

    <VirtualRowView ref="viewRef" :row-height="220" :column-count="columnCount" :padding="6" :metrics="data.metrics" :state="state" @update:state="setState">
        <AuthorListItem v-for="item in data.items" :key="item.id" :item="item"
                        @update:favorite="toggleFavorite(item, $event)"
                        @click="openDetailView(item.id)"
                        @click:illusts="openIllustsOfAuthor"
                        @contextmenu="popupMenu.popup(item)"/>
    </VirtualRowView>
</template>
