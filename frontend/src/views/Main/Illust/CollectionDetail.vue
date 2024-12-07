<script setup lang="ts">
import { Button, Separator } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { BrowserTeleport } from "@/components/logical"
import { BottomLayout, PaneLayout } from "@/components/layout"
import { EmbedPreview } from "@/components-module/preview"
import { IllustImageDataset } from "@/components-module/data"
import { IllustDetailTab, IllustDetailPane } from "@/components-module/common"
import { LockOnButton, DataRouter, FitTypeButton, ColumnNumButton } from "@/components-business/top-bar"
import { Illust } from "@/functions/http-client/api/illust"
import { useCollectionContext } from "@/services/main/illust"
import { MenuItem, useDynamicPopupMenu } from "@/modules/popup-menu"

const {
    target: { path, data, deleteItem, toggleFavorite },
    listview: { listview, paginationData: { data: paginationData, state, setState, navigateTo } },
    listviewController: { viewMode, fitType, columnNum, editableLockOn },
    selector: { selected, selectedIndex, lastSelected, update: updateSelect },
    paneState,
    operators
} = useCollectionContext()

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
    {type: "separator"},
    {type: "normal", label: "删除此集合", click: deleteItem}
]

const menu = useDynamicPopupMenu<Illust>((illust, { alt }) => [
    {type: "normal", label: "打开", click: i => operators.openDetailByClick(i.id)},
    {type: "normal", label: illust.type === "COLLECTION" ? "在新窗口中打开集合" : "在新窗口中打开", click: operators.openInNewWindow},
    {type: "separator"},
    {type: "normal", label: "预览", click: operators.openPreviewBySpace},
    {type: "separator"},
    {type: "checkbox", label: "标记为收藏", checked: illust.favorite, click: i => operators.modifyFavorite(i, !i.favorite)},
    {type: "separator"},
    {type: "normal", label: "暂存", click: operators.addToStagingPost},
    operators.stagingPostCount.value > 0
        ? {type: "normal", label: `将暂存的${operators.stagingPostCount.value}项添加到此处`, click: operators.popStagingPost}
        : {type: "normal", label: "将暂存的项添加到此处", enabled: false},
    {type: "separator"},
    {type: "normal", label: "拆分至新集合", click: operators.splitToGenerateNewCollection},
    {type: "normal", label: "创建画集…", click: operators.createBook},
    {type: "normal", label: "编辑关联组", click: operators.editAssociate},
    {type: "normal", label: "添加到目录…", click: operators.addToFolder},
    {type: "normal", label: "克隆图像属性…", click: operators.cloneImage},
    {type: "separator"},
    {type: "normal", label: alt ? "创建相似项查找任务" : "查找相似项", click: i => operators.findSimilarOfImage(i, alt)},
    {type: "normal", label: "导出", click: operators.exportItem},
    {type: "separator"},
    {type: "normal", label: "删除项目", click: operators.deleteItem},
    {type: "normal", label: "从集合移除此项目", click: operators.removeItemFromCollection}
])

</script>

<template>
    <BrowserTeleport to="top-bar">
        <Button class="flex-item no-grow-shrink" square icon="heart" :type="data?.favorite ? 'danger' : 'secondary'" @click="toggleFavorite"/>
        <Separator/>
        <LockOnButton v-model:value="editableLockOn"/>
        <DataRouter :state="state" @navigate="navigateTo"/>
        <FitTypeButton v-if="viewMode === 'grid'" v-model:value="fitType"/>
        <ColumnNumButton v-if="viewMode === 'grid'" v-model:value="columnNum"/>
        <ElementPopupMenu :items="ellipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
            <Button :ref="setEl" class="flex-item no-grow-shrink" square icon="ellipsis-v" @click="popup"/>
        </ElementPopupMenu>
    </BrowserTeleport>

    <BrowserTeleport to="side-bar">
        <BottomLayout container-class="p-2 pl-3" bottom-class="p-1">
            <KeepAlive>
                <IllustDetailTab :detail-id="path" type="COLLECTION" scene="CollectionDetail"/>
            </KeepAlive>
        </BottomLayout>
    </BrowserTeleport>

    <PaneLayout :show-pane="paneState.visible.value">
        <IllustImageDataset :data="paginationData" :state="state" :query-instance="listview.proxy"
                            :view-mode="viewMode" :fit-type="fitType" :column-num="columnNum" draggable :droppable="editableLockOn"
                            :selected="selected" :selected-index="selectedIndex" :last-selected="lastSelected" :selected-count-badge="!paneState.visible.value"
                            @update:state="setState" @navigate="navigateTo" @select="updateSelect" @contextmenu="menu.popup"
                            @dblclick="operators.openDetailByClick" @enter="operators.openDetailByEnter" @space="operators.openPreviewBySpace"
                            @drop="operators.dataDrop"/>
        <EmbedPreview/>
        <template #pane>
            <IllustDetailPane @close="paneState.visible.value = false"/>
        </template>
    </PaneLayout>
</template>
