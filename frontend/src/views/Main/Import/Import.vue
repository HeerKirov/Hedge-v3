<script setup lang="ts">
import { Button, Separator } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { BrowserTeleport } from "@/components/logical"
import { PaneLayout } from "@/components/layout"
import { DataRouter, FitTypeButton, ColumnNumButton, FileWatcher } from "@/components-business/top-bar"
import { ImportDetailPane } from "@/components-module/common"
import { ImportImageDataset } from "@/components-module/data"
import { ImportRecord } from "@/functions/http-client/api/import"
import { MenuItem, useDynamicPopupMenu } from "@/modules/popup-menu"
import { installImportContext } from "@/services/main/import"
import ImportDialog from "./ImportDialog.vue"
import ImportEmpty from "./ImportEmpty.vue"

const {
    paneState,
    importService: { progress, progressing },
    watcher: { state, setState, paths },
    listview: { listview, paginationData },
    listviewController: { viewMode, fitType, columnNum },
    selector: { selected, lastSelected, update: updateSelect },
    operators: { historyMode, openDialog, deleteItem, openImagePreview, analyseSource, analyseTime, retry, clear }
} = installImportContext()

const ellipsisMenuItems = () => <MenuItem<undefined>[]>[
    {type: "checkbox", label: "在侧边栏预览", checked: paneState.visible.value, click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "radio", checked: viewMode.value === "row", label: "列表模式", click: () => viewMode.value = "row"},
    {type: "radio", checked: viewMode.value === "grid", label: "网格模式", click: () => viewMode.value = "grid"},
    {type: "separator"},
    {type: "checkbox", label: "启用自动导入", checked: !!state.value?.isOpen, click: () => setState(!state.value?.isOpen)},
    {type: "separator"},
    {type: "normal", label: historyMode.value ? "查看现存记录" : "查看历史记录", checked: historyMode.value, click: () => historyMode.value = !historyMode.value},
    {type: "normal", label: historyMode.value ? "清理所有历史记录" : "清理已完成的记录", click: clear},
]

const menu = useDynamicPopupMenu<ImportRecord>(importRecord => [
    {type: "normal", label: "预览", click: openImagePreview},
    {type: "checkbox", label: "在侧边栏预览", checked: paneState.visible.value, click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "submenu", label: "重新生成时间", enabled: importRecord.illust !== null && importRecord.status === "COMPLETED", submenu: [
        {type: "normal", label: "根据默认时间", click: analyseTime},
        {type: "separator"},
        {type: "normal", label: "根据创建时间", click: () => analyseTime(importRecord, "CREATE_TIME")},
        {type: "normal", label: "根据修改时间", click: () => analyseTime(importRecord, "UPDATE_TIME")},
        {type: "normal", label: "根据导入时间", click: () => analyseTime(importRecord, "IMPORT_TIME")}
    ]},
    {type: "normal", label: "重新加载来源", enabled: importRecord.illust !== null && importRecord.status === "COMPLETED", click: analyseSource},
    ...(!historyMode.value && importRecord.status === "ERROR" ? [
        {type: "normal", label: "重试", click: retry} as const,
        {type: "normal", label: "重试并允许无来源", click: () => retry(importRecord, true)} as const
    ] : []),
    {type: "separator"},
    {type: "normal", label: historyMode.value ? "彻底删除导入记录" : "删除导入记录", click: i => deleteItem(i.id)},
])

</script>

<template>
    <BrowserTeleport to="top-bar">
        <Button v-if="!historyMode" type="success" icon="file" @click="openDialog">添加文件</Button>
        <FileWatcher v-if="state?.isOpen" class="ml-1" :paths="paths" :statistic-count="state.statisticCount" :errors="state.errors" @stop="setState(false)"/>
        <Separator/>
        <DataRouter :state="paginationData.state.value" @navigate="paginationData.navigateTo"/>
        <FitTypeButton v-if="viewMode === 'grid'" class="mr-1" v-model:value="fitType"/>
        <ColumnNumButton v-if="viewMode === 'grid'" class="mr-1" v-model:value="columnNum"/>
        <ElementPopupMenu :items="ellipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
            <Button class="flex-item no-grow-shrink" :ref="setEl" square icon="ellipsis-v" @click="popup"/>
        </ElementPopupMenu>
    </BrowserTeleport>

    <PaneLayout :show-pane="paneState.visible.value">
        <!-- FUTURE: Import页面有一个空白页面。然而由于设计缺陷，对DataRouter的写操作是在dataset内完成的。-->
        <!-- 这会导致导航栏的数值无法清零。现在只能通过hidden妥协。 -->
        <!-- 然而如果只是visibility: hidden，还会继续踩另一个坑，contentWidth会被变成0，最终而导致算出的offset是Infinity。所以只能用透明度0妥协。 -->
        <!-- 要想完美解决这个问题，只能等虚拟视图的响应结构重构了。 -->
        <ImportImageDataset :class="{[$style.hidden]: paginationData.state.value !== null && paginationData.state.value.total <= 0}"
                            :data="paginationData.data.value" :state="paginationData.state.value" :query-instance="listview.proxy" :view-mode="viewMode" :fit-type="fitType" :column-num="columnNum"
                            :selected="selected" :last-selected="lastSelected" :selected-count-badge="!paneState.visible.value"
                            @update:state="paginationData.setState" @navigate="paginationData.navigateTo($event)" @select="updateSelect" @contextmenu="menu.popup($event)" @space="openImagePreview()"/>
        <ImportEmpty v-if="paginationData.state.value !== null && paginationData.state.value.total <= 0" :class="$style.empty"/>

        <template #pane>
            <ImportDetailPane @close="paneState.visible.value = false"/>
        </template>
    </PaneLayout>

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