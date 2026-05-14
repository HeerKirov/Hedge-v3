<script setup lang="ts">
import { Button, Separator } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { PaneLayout } from "@/components/layout"
import { AttachFilter, AttachTemplate, DataRouter, FitTypeButton, ColumnNumButton } from "@/components-business/top-bar"
import { LoadingScreen, StorageFileDetailPane } from "@/components-module/common"
import { StorageFileDataset } from "@/components-module/data"
import { MenuItem } from "@/modules/popup-menu"
import { installFileListContext } from "@/services/main/file-storage"

const props = defineProps<{
    block: string
}>()

const {
    listview,
    paginationData,
    queryFilter,
    listviewController: {viewMode, fitType, columnNum},
    selector: {selected, selectedIndex, lastSelected, update: updateSelect},
    paneState,
} = installFileListContext(props.block)

const attachFilterTemplates: AttachTemplate[] = [
    {
        type: "radio",
        field: "extension",
        options: [
            {label: "JPG", value: "jpg", icon: "file-image"},
            {label: "PNG", value: "png", icon: "file-image"},
            {label: "GIF", value: "gif", icon: "file-image"},
            {label: "MP4", value: "mp4", icon: "video"},
            {label: "WebM", value: "webm", icon: "video"},
        ],
    },
    {type: "separator"},
    {
        type: "order",
        items: [
            {label: "按 ID", value: "id"},
            {label: "按文件名", value: "fileName"},
            {label: "按大小", value: "size"},
            {label: "按扩展名", value: "extension"},
        ],
        defaultValue: "id",
        defaultDirection: "descending",
    },
]

const ellipsisMenuItems = () => <MenuItem<undefined>[]>[
    {type: "checkbox", label: "在侧边栏预览", checked: paneState.visible.value, click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "radio", checked: viewMode.value === "row", label: "列表模式", click: () => viewMode.value = "row"},
    {type: "radio", checked: viewMode.value === "grid", label: "网格模式", click: () => viewMode.value = "grid"},
]

</script>

<template>
    <Teleport to="#app-storage-view-toolbar">
        <AttachFilter class="ml-1" :templates="attachFilterTemplates" v-model:value="queryFilter"/>
        <DataRouter :state="paginationData.state.value" @navigate="paginationData.navigateTo"/>
        <Separator/>
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
