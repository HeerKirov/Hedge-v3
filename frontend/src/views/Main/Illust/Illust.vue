<script setup lang="ts">
import { Button, Separator } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { BrowserTeleport } from "@/components/logical"
import { PaneLayout } from "@/components/layout"
import { IllustImageDataset } from "@/components-module/data"
import { IllustDetailPane } from "@/components-module/common"
import { SearchBox, LockOnButton, DataRouter, FitTypeButton, ColumnNumButton, QueryNotificationBadge, CollectionModeButton } from "@/components-business/top-bar"
import { Illust } from "@/functions/http-client/api/illust"
import { useIllustContext } from "@/services/main/illust"
import { MenuItem, useDynamicPopupMenu } from "@/modules/popup-menu"

const {
    paneState,
    listview: { listview, paginationData: { data, state, setState, navigateTo } },
    listviewController: { viewMode, fitType, columnNum, collectionMode, editableLockOn },
    selector: { selected, lastSelected, update: updateSelect },
    querySchema,
    operators
} = useIllustContext()

const ellipsisMenuItems = () => <MenuItem<undefined>[]>[
    {type: "checkbox", label: "在侧边栏预览", checked: paneState.visible.value, click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "checkbox", label: "解除编辑锁定", checked: editableLockOn.value, click: () => editableLockOn.value = !editableLockOn.value},
    {type: "separator"},
    {type: "radio", checked: viewMode.value === "row", label: "列表模式", click: () => viewMode.value = "row"},
    {type: "radio", checked: viewMode.value === "grid", label: "网格模式", click: () => viewMode.value = "grid"},
    {type: "separator"},
    {type: "submenu", label: "更改图像", enabled: selected.value.length > 0, submenu: [
        {type: "normal", label: "图像格式转换", click: () => operators.fileEdit(undefined, "convertFormat")},
    ]},
]

const menu = useDynamicPopupMenu<Illust>(illust => [
    {type: "normal", label: "打开", click: i => operators.openDetailByClick(i.id)},
    (illust.type === "COLLECTION" || null) && {type: "normal", label: "查看集合详情", click: i => operators.openCollectionDetail(i.id)},
    (illust.type === "COLLECTION" || null) && {type: "normal", label: "在新标签页打开集合", click: i => operators.openCollectionDetail(i.id, "newTab")},
    {type: "normal", label: illust.type === "COLLECTION" ? "在新窗口中打开集合" : "在新窗口中打开", click: operators.openInNewWindow},
    {type: "separator"},
    {type: "normal", label: "预览", click: operators.openPreviewBySpace},
    {type: "checkbox", checked: paneState.visible.value, label: "在侧边栏预览", click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "checkbox", label: "标记为收藏", checked: illust.favorite, click: i => operators.modifyFavorite(i, !i.favorite)},
    {type: "separator"},
    {type: "normal", label: "暂存", click: operators.addToStagingPost},
    {type: "separator"},
    {type: "normal", label: "创建图像集合", click: operators.createCollection},
    {type: "normal", label: "创建画集…", click: operators.createBook},
    {type: "normal", label: "编辑关联组", click: operators.editAssociate},
    {type: "normal", label: "添加到目录…", click: operators.addToFolder},
    {type: "normal", label: "克隆图像属性…", click: operators.cloneImage},
    {type: "separator"},
    {type: "submenu", label: "快捷排序", enabled: selected.value.length > 1, submenu: [
        {type: "normal", label: "将时间分区集中在最多的那天", click: i => operators.batchUpdateTimeSeries(i, "SET_PARTITION_TIME_MOST")},
        {type: "normal", label: "将时间分区设为最早的那天", click: i => operators.batchUpdateTimeSeries(i, "SET_PARTITION_TIME_EARLIEST")},
        {type: "normal", label: "将时间分区设为最晚的那天", click: i => operators.batchUpdateTimeSeries(i, "SET_PARTITION_TIME_LATEST")},
        {type: "separator"},
        {type: "normal", label: "将排序时间集中在最多的那天", click: i => operators.batchUpdateTimeSeries(i, "SET_ORDER_TIME_MOST")},
        {type: "normal", label: "倒置排序时间", click: i => operators.batchUpdateTimeSeries(i, "SET_ORDER_TIME_REVERSE")},
        {type: "normal", label: "均匀分布排序时间", click: i => operators.batchUpdateTimeSeries(i, "SET_ORDER_TIME_UNIFORMLY")},
        {type: "separator"},
        {type: "normal", label: "按来源ID顺序重设排序时间", click: i => operators.batchUpdateTimeSeries(i, "SET_ORDER_TIME_BY_SOURCE_ID")},
    ]},
    {type: "normal", label: "查找相似项", click: operators.findSimilarOfImage},
    {type: "normal", label: "导出", click: operators.exportItem},
    {type: "separator"},
    {type: "normal", label: illust.type === "COLLECTION" ? "删除集合项目" : "删除项目", click: operators.deleteItem}
])

</script>

<template>
    <BrowserTeleport to="top-bar">
        <CollectionModeButton class="mr-1" v-model:value="collectionMode"/>
        <SearchBox placeholder="在此处搜索" v-model:value="querySchema.queryInputText.value" :enable-drop-button="!!querySchema.query.value" v-model:active-drop-button="querySchema.expanded.value" :schema="querySchema.schema.value"/>
        <QueryNotificationBadge class="ml-1" :schema="querySchema.schema.value" @click="querySchema.expanded.value = true"/>
        <Separator/>
        <LockOnButton v-model:value="editableLockOn"/>
        <DataRouter :state="state" @navigate="navigateTo"/>
        <FitTypeButton v-if="viewMode === 'grid'" v-model:value="fitType"/>
        <ColumnNumButton v-if="viewMode === 'grid'" v-model:value="columnNum"/>
        <ElementPopupMenu :items="ellipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
            <Button :ref="setEl" class="flex-item no-grow-shrink" square icon="ellipsis-v" @click="popup"/>
        </ElementPopupMenu>
    </BrowserTeleport>

    <PaneLayout :show-pane="paneState.visible.value">
        <IllustImageDataset :data="data" :state="state" :query-instance="listview.proxy"
                            :view-mode="viewMode" :fit-type="fitType" :column-num="columnNum" draggable :droppable="editableLockOn"
                            :selected="selected" :last-selected="lastSelected" :selected-count-badge="!paneState.visible.value"
                            @update:state="setState" @navigate="navigateTo" @select="updateSelect" @contextmenu="menu.popup($event as Illust)"
                            @dblclick="(i, s) => operators.openDetailByClick(i, s)"
                            @enter="operators.openDetailByEnter($event)" @space="operators.openPreviewBySpace()"
                            @drop="(a, b, c) => operators.dataDrop(a, b, c)"/>

        <template #pane>
            <IllustDetailPane @close="paneState.visible.value = false"/>
        </template>
    </PaneLayout>
</template>
