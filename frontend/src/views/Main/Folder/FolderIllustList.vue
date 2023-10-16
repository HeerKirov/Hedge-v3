<script setup lang="ts">
import { computed } from "vue"
import { Button, Separator } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { TopBarLayout, MiddleLayout, PaneLayout } from "@/components/layout"
import { DataRouter, FitTypeButton, ColumnNumButton } from "@/components-business/top-bar"
import { IllustImageDataset } from "@/components-module/data"
import { IllustDetailPane } from "@/components-module/common"
import { FolderImage } from "@/functions/http-client/api/folder"
import { MenuItem, useDynamicPopupMenu } from "@/modules/popup-menu"
import { useFolderDetailPanel } from "@/services/main/folder"

const {
    data, deleteItem, viewState,
    listview: { paginationData },
    listviewController: { viewMode, fitType, columnNum, editableLockOn },
    selector: { selected, lastSelected, update: updateSelect },
    paneState,
    operators
} = useFolderDetailPanel()

const ellipsisMenuItems = computed(() => <MenuItem<undefined>[]>[
    {type: "checkbox", label: "在侧边栏预览", checked: paneState.visible.value, click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "checkbox", label: "解除编辑锁定", checked: editableLockOn.value, click: () => editableLockOn.value = !editableLockOn.value},
    {type: "separator"},
    {type: "radio", checked: viewMode.value === "row", label: "列表模式", click: () => viewMode.value = "row"},
    {type: "radio", checked: viewMode.value === "grid", label: "网格模式", click: () => viewMode.value = "grid"},
    {type: "separator"},
    {type: "normal", label: "删除此目录", click: deleteItem}
])

const menu = useDynamicPopupMenu<FolderImage>(folderImage => [
    {type: "normal", label: "打开", click: i => operators.openDetailByClick(i.id)},
    {type: "normal", label: "在新窗口中打开", click: operators.openInNewWindow},
    {type: "separator"},
    {type: "normal", label: "预览", click: operators.openPreviewBySpace},
    {type: "checkbox", checked: paneState.visible.value, label: "在侧边栏预览", click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "checkbox", label: "标记为收藏", checked: folderImage.favorite, click: i => operators.modifyFavorite(i, !i.favorite)},
    {type: "separator"},
    {type: "normal", label: "暂存", click: operators.addToStagingPost},
    operators.stagingPostCount.value > 0 && editableLockOn.value
        ? {type: "normal", label: `将暂存的${operators.stagingPostCount.value}项添加到此处`, click: operators.popStagingPost}
        : {type: "normal", label: "将暂存的项添加到此处", enabled: false},
    {type: "separator"},
    {type: "normal", label: "创建图像集合", click: operators.createCollection},
    {type: "normal", label: "创建画集…", click: operators.createBook},
    {type: "normal", label: "编辑关联组", click: operators.editAssociate},
    {type: "normal", label: "添加到目录…", click: operators.addToFolder},
    {type: "normal", label: "克隆图像属性…", click: operators.cloneImage},
    {type: "separator"},
    {type: "normal", label: "导出", click: operators.exportItem},
    {type: "separator"},
    {type: "normal", label: "删除项目", click: operators.deleteItem},
    {type: "normal", label: "从目录移除此项目", click: i => operators.removeItemFromFolder(i, data.value!.id) }
])

</script>

<template>
    <TopBarLayout>
        <template #top-bar>
            <MiddleLayout>
                <template #left>
                    <Button square icon="angle-left" @click="viewState.closeView()"/>
                    <span v-if="data !== null" class="ml-2 is-font-size-large">{{data.title}}</span>
                </template>

                <template #right>
                    <Button square :mode="editableLockOn ? 'filled' : undefined" :type="editableLockOn ? 'danger' : undefined" :icon="editableLockOn ? 'lock-open' : 'lock'" @click="editableLockOn = !editableLockOn"/>
                    <Separator/>
                    <DataRouter/>
                    <FitTypeButton v-if="viewMode === 'grid'" class="mr-1" v-model:value="fitType"/>
                    <ColumnNumButton v-if="viewMode === 'grid'" class="mr-1" v-model:value="columnNum"/>
                    <ElementPopupMenu :items="ellipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
                        <Button :ref="setEl" square icon="ellipsis-v" @click="popup"/>
                    </ElementPopupMenu>
                </template>
            </MiddleLayout>
        </template>

        <PaneLayout :show-pane="paneState.visible.value">
            <IllustImageDataset :data="paginationData.data" :query-instance="paginationData.proxy"
                                :view-mode="viewMode" :fit-type="fitType" :column-num="columnNum" draggable :droppable="editableLockOn"
                                :selected="selected" :last-selected="lastSelected" :selected-count-badge="!paneState.visible.value"
                                @data-update="paginationData.dataUpdate" @select="updateSelect" @contextmenu="menu.popup($event as FolderImage)"
                                @dblclick="operators.openDetailByClick($event)" @enter="operators.openDetailByEnter($event)" @space="operators.openPreviewBySpace()"
                                @drop="(a, b, c) => operators.dataDrop(a, b, c)"/>

            <template #pane>
                <IllustDetailPane @close="paneState.visible.value = false"/>
            </template>
        </PaneLayout>
    </TopBarLayout>
</template>
