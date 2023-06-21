<script setup lang="ts">
import { computed } from "vue"
import { Button } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { TopBarLayout, MiddleLayout, PaneLayout } from "@/components/layout"
import { DataRouter, FitTypeButton, ColumnNumButton } from "@/components-business/top-bar"
import { TrashedImageDataset } from "@/components-module/data"
import { TrashedDetailPane } from "@/components-module/common"
import { TrashedImage } from "@/functions/http-client/api/trash"
import { installTrashContext } from "@/services/main/trash"
import { MenuItem, usePopupMenu } from "@/modules/popup-menu"

const { 
    paneState,
    listview: { paginationData },
    selector: { selected, lastSelected, update: updateSelect },
    listviewController: { viewMode, fitType, columnNum },
    operators: { deleteItem, restoreItem }
} = installTrashContext()

const ellipsisMenuItems = computed(() => <MenuItem<undefined>[]>[
    {type: "checkbox", label: "显示信息预览", checked: paneState.visible.value, click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "radio", checked: viewMode.value === "row", label: "列表模式", click: () => viewMode.value = "row"},
    {type: "radio", checked: viewMode.value === "grid", label: "网格模式", click: () => viewMode.value = "grid"}
])

const menu = usePopupMenu<TrashedImage>(() => [
    {type: "checkbox", label: "显示信息预览", checked: paneState.visible.value, click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "normal", label: "还原", click: i => restoreItem(i.id)},
    {type: "separator"},
    {type: "normal", label: "删除项目", click: i => deleteItem(i.id)}
])

</script>

<template>
    <TopBarLayout>
        <template #top-bar>
            <MiddleLayout>
                <template #right>
                    <DataRouter/>
                    <FitTypeButton v-if="viewMode === 'grid'" class="mr-1" v-model:value="fitType"/>
                    <ColumnNumButton v-if="viewMode === 'grid'" class="mr-1" v-model:value="columnNum"/>
                    <ElementPopupMenu :items="ellipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
                        <Button :ref="setEl" expose-el square icon="ellipsis-v" @click="popup"/>
                    </ElementPopupMenu>
                </template>
            </MiddleLayout>
        </template>

        <PaneLayout :show-pane="paneState.visible.value">
            <div v-if="paginationData.data.metrics.total !== undefined && paginationData.data.metrics.total <= 0" class="h-100 has-text-centered">
                <p class="secondary-text"><i>没有任何暂存的已删除项目</i></p>
            </div>
            <TrashedImageDataset v-else :data="paginationData.data" :query-instance="paginationData.proxy"
                                :view-mode="viewMode" :fit-type="fitType" :column-num="columnNum"
                                :selected="selected" :last-selected="lastSelected" :selected-count-badge="!paneState.visible.value"
                                @data-update="paginationData.dataUpdate" @select="updateSelect" @contextmenu="menu.popup($event)"/>

            <template #pane>
                <TrashedDetailPane :state="paneState.state.value" @close="paneState.visible.value = false"/>
            </template>
        </PaneLayout>
    </TopBarLayout>
</template>