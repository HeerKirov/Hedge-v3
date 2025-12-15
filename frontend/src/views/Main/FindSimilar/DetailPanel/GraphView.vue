<script setup lang="ts">
import { FindSimilarResultDetailImage } from "@/functions/http-client/api/find-similar"
import { useFindSimilarDetailPanel, useGraphView } from "@/services/main/find-similar"
import { useDynamicPopupMenu } from "@/modules/popup-menu"

const { operators: { allBooks, modifyFavorite, addToStagingPost, addToCollection, addToBook, markIgnored, cloneImage, deleteItem, openImageInPartition, openDetailByClick, openPreviewBySpace } } = useFindSimilarDetailPanel()

const { chartDom } = useGraphView({
    menu: useDynamicPopupMenu<FindSimilarResultDetailImage>(illust => [
        {type: "normal", label: "打开", click: i => openDetailByClick(i.id)},
        {type: "normal", label: "预览", click: i => openPreviewBySpace(i)},
        {type: "separator"},
        {type: "normal", label: "暂存", click: i => addToStagingPost(i)},
        {type: "separator"},
        {type: "normal", label: "在时间分区显示", click: i => openImageInPartition(i.id, i.partitionTime)},
        {type: "normal", label: "在新标签页的时间分区显示", click: i => openImageInPartition(i.id, i.partitionTime, "NEW_TAB")},
        {type: "separator"},
        {type: "checkbox", label: "标记为收藏", checked: illust.favorite, click: i => modifyFavorite(i, !i.favorite)},
        {type: "separator"},
        {type: "normal", label: "加入集合…", click: () => addToCollection(illust.id)},
        {type: "submenu", label: "加入画集", enabled: allBooks.value.length > 0, submenu: allBooks.value.map(b => ({type: "normal", label: b.title, click: () => addToBook(b.id, illust.id)} as const))},
        {type: "normal", label: "图像替换…", click: () => cloneImage(illust.id)},
        {type: "normal", label: "添加忽略标记", click: () => markIgnored(illust.id)},
        {type: "separator"},
        {type: "normal", label: "删除此项目", click: () => deleteItem(illust.id)}
    ]).popup
})

</script>

<template>
    <div ref="chartDom"/>
</template>
