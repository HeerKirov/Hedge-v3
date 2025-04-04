<script setup lang="ts">
import { Button, Separator } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { BrowserTeleport } from "@/components/logical"
import { IllustImageDataset } from "@/components-module/data"
import { IllustDetailPane, LoadingScreen } from "@/components-module/common"
import { PaneLayout } from "@/components/layout"
import { DataRouter, FitTypeButton, ColumnNumButton, CollectionModeButton, SearchBox, LockOnButton } from "@/components-business/top-bar"
import { EmbedPreview } from "@/components-module/preview"
import { Illust } from "@/functions/http-client/api/illust"
import { useDetailIllustContext } from "@/services/main/partition"
import { MenuItem, useDynamicPopupMenu } from "@/modules/popup-menu"

const {
    paneState,
    listview: { listview, paginationData: { data, state, setState, navigateTo }, status },
    listviewController: { viewMode, fitType, columnNum, collectionMode, editableLockOn },
    selector: { selected, selectedIndex, lastSelected, update: updateSelect },
    querySchema,
    operators
} = useDetailIllustContext()

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

const menu = useDynamicPopupMenu<Illust>((illust, { alt }) => [
    {type: "normal", label: "打开", click: i => operators.openDetailByClick(i.id)},
    (illust.type === "COLLECTION" || null) && {type: "normal", label: "查看集合详情", click: i => operators.openCollectionDetail(i.id)},
    (illust.type === "COLLECTION" || null) && {type: "normal", label: "在新标签页打开集合", click: i => operators.openCollectionDetail(i.id, "newTab")},
    {type: "normal", label: illust.type === "COLLECTION" ? "在新窗口中打开集合" : "在新窗口中打开", click: operators.openInNewWindow},
    {type: "separator"},
    {type: "normal", label: "预览", click: operators.openPreviewBySpace},
    {type: "separator"},
    {type: "checkbox", label: "标记为收藏", checked: illust.favorite, click: i => operators.modifyFavorite(i, !i.favorite)},
    {type: "separator"},
    {type: "normal", label: "暂存", click: operators.addToStagingPost},
    {type: "separator"},
    {type: "normal", label: alt ? "以推荐参数创建图像集合" : "创建图像集合", click: i => operators.createCollection(i, alt)},
    {type: "normal", label: "创建画集…", click: operators.createBook},
    {type: "normal", label: "编辑关联组", click: operators.editAssociate},
    {type: "normal", label: "添加到目录…", click: operators.addToFolder},
    {type: "normal", label: "克隆图像属性…", click: operators.cloneImage},
    {type: "separator"},
    {type: "normal", label: alt ? "以默认选项快捷整理" : "快捷整理", enabled: selected.value.length > 1, click: i => operators.organizeOfImage(i, alt)},
    {type: "normal", label: alt ? "创建相似项查找任务" : "查找相似项", click: i => operators.findSimilarOfImage(i, alt)},
    {type: "normal", label: "导出", click: operators.exportItem},
    {type: "separator"},
    {type: "normal", label: illust.type === "COLLECTION" ? "删除集合项目" : "删除项目", click: operators.deleteItem}
])

</script>

<template>
    <BrowserTeleport to="top-bar">
        <CollectionModeButton class="mr-1" v-model:value="collectionMode"/>
        <SearchBox placeholder="在此处搜索" dialect="ILLUST" v-model:value="querySchema.queryInputText.value" :schema="querySchema.schema.value" :time-cost="status.timeCost"/>
        <Separator/>
        <LockOnButton v-model:value="editableLockOn"/>
        <DataRouter :state="state" @navigate="navigateTo"/>
        <FitTypeButton v-if="viewMode === 'grid'" v-model:value="fitType"/>
        <ColumnNumButton v-if="viewMode === 'grid'" v-model:value="columnNum"/>
        <ElementPopupMenu :items="ellipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
            <Button class="flex-item no-grow-shrink" :ref="setEl" square icon="ellipsis-v" @click="popup"/>
        </ElementPopupMenu>
    </BrowserTeleport>

    <PaneLayout scope-name="illust" :show-pane="paneState.visible.value">
        <IllustImageDataset :data="data" :state="state" :query-instance="listview.proxy"
                            :view-mode="viewMode" :fit-type="fitType" :column-num="columnNum" draggable :droppable="editableLockOn"
                            :selected="selected" :selected-index="selectedIndex" :last-selected="lastSelected" :selected-count-badge="!paneState.visible.value"
                            @update:state="setState" @navigate="navigateTo" @select="updateSelect" @contextmenu="menu.popup"
                            @dblclick="operators.openDetailByClick"
                            @enter="operators.openDetailByEnter" @space="operators.openPreviewBySpace"
                            @drop="operators.dataDrop"/>
        <EmbedPreview/>
        <LoadingScreen/>
        <template #pane>
            <IllustDetailPane tab-scope="illust" @close="paneState.visible.value = false"/>
        </template>
    </PaneLayout>
</template>

