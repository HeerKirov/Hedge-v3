<script setup lang="ts">
import { Button, Separator } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { PaneLayout } from "@/components/layout"
import { DataRouter, FitTypeButton, ColumnNumButton } from "@/components-business/top-bar"
import { LoadingScreen, StorageFileDetailPane } from "@/components-module/common"
import { StorageFileDataset } from "@/components-module/data"
import { BlockFileItem } from "@/functions/http-client/api/file-storage"
import { MenuItem, useDynamicPopupMenu } from "@/modules/popup-menu"
import { installFileListContext } from "@/services/main/file-storage"

const props = defineProps<{
    block: string
}>()

const {
    block,
    listview: {listview, paginationData},
    listviewController: {viewMode, fitType, columnNum},
    selector: {selected, selectedIndex, lastSelected, update: updateSelect},
    paneState,
} = installFileListContext(props.block)

const ellipsisMenuItems = () => <MenuItem<undefined>[]>[
    {type: "checkbox", label: "在侧边栏预览", checked: paneState.visible.value, click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "radio", checked: viewMode.value === "row", label: "列表模式", click: () => viewMode.value = "row"},
    {type: "radio", checked: viewMode.value === "grid", label: "网格模式", click: () => viewMode.value = "grid"},
]

</script>

<template>
    <Teleport to="#app-storage-view-toolbar">
        <DataRouter :state="paginationData.state.value" @navigate="paginationData.navigateTo"/>
        <FitTypeButton v-if="viewMode === 'grid'" class="mr-1" v-model:value="fitType"/>
        <ColumnNumButton v-if="viewMode === 'grid'" class="mr-1" v-model:value="columnNum"/>
        <ElementPopupMenu :items="ellipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
            <Button class="flex-item no-grow-shrink" :ref="setEl" square icon="ellipsis-v" @click="popup"/>
        </ElementPopupMenu>
    </Teleport>

    <PaneLayout scope-name="storage-block-file" :show-pane="paneState.visible.value">
        <StorageFileDataset :data="paginationData.data.value" :state="paginationData.state.value" :query-instance="listview.proxy"
                            :view-mode="viewMode" :fit-type="fitType" :column-num="columnNum"
                            :selected="selected" :selected-index="selectedIndex" :last-selected="lastSelected" :selected-count-badge="!paneState.visible.value"
                            :draggable="false" :droppable="false"
                            @update:state="paginationData.setState" @navigate="paginationData.navigateTo" @select="updateSelect"/>
        <LoadingScreen :loading="paginationData.status.value.loading"/>
        <template #pane>
            <StorageFileDetailPane @close="paneState.visible.value = false"/>
        </template>
    </PaneLayout>
</template>
