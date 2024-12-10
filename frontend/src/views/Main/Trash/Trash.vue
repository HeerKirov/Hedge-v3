<script setup lang="ts">
import { Button } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { BrowserTeleport } from "@/components/logical"
import { PaneLayout } from "@/components/layout"
import { DataRouter, FitTypeButton, ColumnNumButton } from "@/components-business/top-bar"
import { TrashedImageDataset } from "@/components-module/data"
import { TrashedDetailPane } from "@/components-module/common"
import { TrashedImage } from "@/functions/http-client/api/trash"
import { installTrashContext } from "@/services/main/trash"
import { MenuItem, usePopupMenu } from "@/modules/popup-menu"

const { 
    paneState,
    listview: { listview, paginationData: { data, state, setState, navigateTo } },
    selector: { selected, selectedIndex, lastSelected, update: updateSelect },
    listviewController: { viewMode, fitType, columnNum },
    operators: { deleteItem, restoreItem }
} = installTrashContext()

const ellipsisMenuItems = () => <MenuItem<undefined>[]>[
    {type: "checkbox", label: "在侧边栏预览", checked: paneState.visible.value, click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "radio", checked: viewMode.value === "row", label: "列表模式", click: () => viewMode.value = "row"},
    {type: "radio", checked: viewMode.value === "grid", label: "网格模式", click: () => viewMode.value = "grid"}
]

const menu = usePopupMenu<TrashedImage>([
    {type: "normal", label: "还原", click: i => restoreItem(i.id)},
    {type: "separator"},
    {type: "normal", label: "删除项目", click: i => deleteItem(i.id)}
])

</script>

<template>
    <BrowserTeleport to="top-bar">
        <DataRouter :state="state" @navigate="navigateTo"/>
        <FitTypeButton v-if="viewMode === 'grid'" v-model:value="fitType"/>
        <ColumnNumButton v-if="viewMode === 'grid'" v-model:value="columnNum"/>
        <ElementPopupMenu :items="ellipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
            <Button class="flex-item no-grow-shrink" :ref="setEl" square icon="ellipsis-v" @click="popup"/>
        </ElementPopupMenu>
    </BrowserTeleport>

    <PaneLayout scope-name="trash" :show-pane="paneState.visible.value">
        <div v-if="state !== null && state.total <= 0" class="h-100 has-text-centered">
            <p class="secondary-text"><i>没有任何暂存的已删除项目</i></p>
        </div>
        <TrashedImageDataset v-else :data="data" :state="state" :query-instance="listview.proxy"
                             :view-mode="viewMode" :fit-type="fitType" :column-num="columnNum"
                             :selected="selected" :selected-index="selectedIndex" :last-selected="lastSelected" :selected-count-badge="!paneState.visible.value"
                             @update:state="setState" @navigate="navigateTo" @select="updateSelect" @contextmenu="menu.popup($event)"/>

        <template #pane>
            <TrashedDetailPane @close="paneState.visible.value = false"/>
        </template>
    </PaneLayout>
</template>