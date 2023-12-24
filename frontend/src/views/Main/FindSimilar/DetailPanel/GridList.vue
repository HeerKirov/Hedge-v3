<script setup lang="ts">
import { IllustImageDataset } from "@/components-module/data"
import { CommonIllust } from "@/functions/http-client/api/illust"
import { useDynamicPopupMenu } from "@/modules/popup-menu"
import { useFindSimilarDetailPanel } from "@/services/main/find-similar"

const {
    listview,
    paginationData: { data, state, setState, navigateTo },
    selector: { selected, lastSelected, update: updateSelect }, 
    listviewController: { fitType, columnNum }, 
    operators: { allBooks, allCollections, addToCollection, addToBook, markIgnored, deleteItem, cloneImage, openPreviewBySpace } 
} = useFindSimilarDetailPanel()

const menu = useDynamicPopupMenu<CommonIllust>(illust => [
    {type: "normal", label: "预览", click: i => openPreviewBySpace(i)},
    {type: "separator"},
    {type: "checkbox", label: "标记为收藏", checked: illust.favorite},
    {type: "separator"},
    {type: "submenu", label: "加入集合", submenu: [
        ...allCollections.value.map(id => ({type: "normal", label: `集合:${id}`, click: () => addToCollection(id, illust.id) } as const)),
        ...(allCollections.value.length > 0 ? [{type: "separator"} as const] : []),
        {type: "normal", label: "创建新集合", click: () => addToCollection("new", illust.id)}
    ]},
    {type: "submenu", label: "加入画集", enabled: allBooks.value.length > 0, submenu: allBooks.value.map(id => ({type: "normal", label: `画集:${id}`, click: () => addToBook(id, illust.id)} as const))},
    {type: "normal", label: "克隆图像属性…", click: () => cloneImage(illust.id)},
    {type: "normal", label: "添加忽略标记", click: () => markIgnored(illust.id)},
    {type: "separator"},
    {type: "normal", label: "删除此项目", click: () => deleteItem(illust.id)}
])

</script>

<template>
    <IllustImageDataset :data="data" :state="state" :query-instance="listview.proxy"
                        view-mode="grid" :fit-type="fitType" :column-num="columnNum"
                        :selected="selected" :last-selected="lastSelected" @select="updateSelect"
                        @update:state="setState" @navigate="navigateTo" @space="openPreviewBySpace()" @contextmenu="menu.popup($event)"/>
</template>
