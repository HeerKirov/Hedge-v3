<script setup lang="ts">
import { computed } from "vue"
import { Button, Separator } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { TopBarLayout, MiddleLayout, PaneLayout } from "@/components/layout"
import { DataRouter, FitTypeButton, ColumnNumButton } from "@/components-business/top-bar"
import { ImportImageDataset, ImportDetailPane } from "@/components-module/data"
import { ImportImage } from "@/functions/http-client/api/import"
import { MenuItem, usePopupMenu } from "@/modules/popup-menu"
import { installImportContext } from "@/services/main/import"
import ImportDialog from "./ImportDialog.vue"

const {
    paneState,
    importService: { progress, progressing },
    listview: { listview, paginationData, anyData },
    listviewController: { viewMode, fitType, columnNum },
    selector: { selected, lastSelected, update: updateSelect },
    operators: { openDialog, save, deleteItem }
} = installImportContext()

const ellipsisMenuItems = computed(() => <MenuItem<undefined>[]>[
    {type: "checkbox", label: "显示信息预览", checked: paneState.visible.value, click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "radio", checked: viewMode.value === "row", label: "列表模式", click: () => viewMode.value = "row"},
    {type: "radio", checked: viewMode.value === "grid", label: "网格模式", click: () => viewMode.value = "grid"},
    {type: "separator"},
    {type: "normal", label: "确认导入图库", enabled: anyData.value, click: save}
])

const menu = usePopupMenu<ImportImage>(() => [
    {type: "checkbox", label: "显示信息预览", checked: paneState.visible.value, click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "normal", label: "删除项目", click: i => deleteItem(i.id)},
])

</script>

<template>
    <TopBarLayout>
        <template #top-bar>
            <MiddleLayout>
                <template #left>
                    <Button type="success" icon="file" @click="openDialog">添加文件</Button>
                </template>
                <template #right>
                    <Button v-if="anyData" type="primary" icon="check" @click="save">导入图库</Button>
                    <Button v-else disabled icon="check" @click="save">确认导入</Button>
                    <Separator/>
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
            <div v-if="paginationData.data.metrics.total !== undefined && paginationData.data.metrics.total <= 0" class="h-100 has-text-centered relative">
                <p class="secondary-text"><i>没有任何暂存的导入项目</i></p>
                <div class="absolute center">
                    <Button mode="light" type="success" icon="file" @click="openDialog">添加文件</Button>
                    <p class="mt-2 has-text-secondary">或拖曳文件到此处</p>
                </div>
            </div>
            <ImportImageDataset v-else :data="paginationData.data" :query-instance="paginationData.proxy"
                                :view-mode="viewMode" :fit-type="fitType" :column-num="columnNum"
                                :selected="selected" :last-selected="lastSelected" :selected-count-badge="!paneState.visible.value"
                                @data-update="paginationData.dataUpdate" @select="updateSelect" @contextmenu="menu.popup($event)"/>

            <template #pane>
                <ImportDetailPane :state="paneState.state" @close="paneState.visible.value = false"/>
            </template>
        </PaneLayout>
    </TopBarLayout>
    <ImportDialog :progress="progress" :progressing="progressing"/>
</template>
