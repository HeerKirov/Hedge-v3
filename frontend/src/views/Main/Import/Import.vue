<script setup lang="ts">
import { computed } from "vue"
import { Button, Separator } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { TopBarLayout, MiddleLayout, PaneLayout } from "@/components/layout"
import { DataRouter, FitTypeButton, ColumnNumButton, FileWatcher } from "@/components-business/top-bar"
import { ImportDetailPane } from "@/components-module/common"
import { ImportImageDataset } from "@/components-module/data"
import { ImportImage } from "@/functions/http-client/api/import"
import { MenuItem, usePopupMenu } from "@/modules/popup-menu"
import { useDroppableForFile } from "@/modules/drag"
import { installImportContext } from "@/services/main/import"
import ImportDialog from "./ImportDialog.vue"
import ImportEmpty from "./ImportEmpty.vue"

const {
    paneState,
    importService: { progress, progressing },
    watcher: { state, setState, paths },
    listview: { paginationData, anyData },
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
    {type: "checkbox", label: "启用自动导入", checked: !!state.value?.isOpen, click: () => setState(!state.value?.isOpen)},
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
                    <FileWatcher v-if="state?.isOpen" class="ml-1" :paths="paths" :statistic-count="state.statisticCount" :errors="state.errors" @stop="setState(false)"/>
                </template>
                <template #right>
                    <Button v-if="anyData" type="primary" icon="check" @click="save">{{selected.length > 0 ? `${selected.length}项` : '全部'}}导入图库</Button>
                    <Button v-else disabled icon="check">全部导入图库</Button>
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
            <!-- FUTURE: Import页面有一个空白页面。然而由于设计缺陷，对DataRouter的写操作是在dataset内完成的。-->
            <!-- 这会导致导航栏的数值无法清零。现在只能通过hidden妥协。 -->
            <!-- 然而如果只是visibility: hidden，还会继续踩另一个坑，contentWidth会被变成0，最终而导致算出的offset是Infinty。所以只能用透明度0妥协。 -->
            <!-- 要想完美解决这个问题，只能等虚拟视图的响应结构重构了。 -->
            <ImportImageDataset :class="{[$style.hidden]: paginationData.data.metrics.total !== undefined && paginationData.data.metrics.total <= 0}"
                :data="paginationData.data" :query-instance="paginationData.proxy"
                :view-mode="viewMode" :fit-type="fitType" :column-num="columnNum"
                :selected="selected" :last-selected="lastSelected" :selected-count-badge="!paneState.visible.value"
                @data-update="paginationData.dataUpdate" @select="updateSelect" @contextmenu="menu.popup($event)"/>
            <ImportEmpty v-if="paginationData.data.metrics.total !== undefined && paginationData.data.metrics.total <= 0" :class="$style.empty"/>

            <template #pane>
                <ImportDetailPane @close="paneState.visible.value = false"/>
            </template>
        </PaneLayout>
    </TopBarLayout>
    <ImportDialog :progress="progress" :progressing="progressing"/>
</template>

<style module lang="sass">
.hidden
    opacity: 0
    position: absolute

.empty
    height: 100%
    width: 100%
    position: absolute
    top: 0
</style>