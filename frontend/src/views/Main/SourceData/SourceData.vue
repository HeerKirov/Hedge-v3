<script setup lang="ts">
import { computed } from "vue"
import { Button, Separator } from "@/components/universal"
import { PaneLayout } from "@/components/layout"
import { VirtualRowView } from "@/components/data"
import { BrowserTeleport } from "@/components/logical"
import { SearchBox, DataRouter } from "@/components-business/top-bar"
import { LoadingScreen } from "@/components-module/common"
import { useDialogService } from "@/components-module/dialog"
import { usePopupMenu } from "@/modules/popup-menu"
import { installSourceDataContext } from "@/services/main/source-data"
import SourceDataListItem from "./SourceDataListItem.vue"
import SourceDataDetailPane from "./SourceDataDetailPane.vue"

const { paneState, listview: { paginationData: { data, state, setState, navigateTo }, status }, querySchema, operators } = installSourceDataContext()

const resultWithKey = computed(() => data.value.items.map(item => ({item, key: `${item.sourceSite}-${item.sourceId}`, identity: {sourceSite: item.sourceSite, sourceId: item.sourceId}})))

const { sourceDataEditor } = useDialogService()

const popupMenu = usePopupMenu([
    {type: "normal", label: "查看详情", click: paneState.openDetailView},
    {type: "separator"},
    {type: "normal", label: "编辑", click: sourceDataEditor.edit},
    {type: "separator"},
    {type: "normal", label: "删除此项", click: operators.deleteItem},
])

</script>

<template>
    <BrowserTeleport to="top-bar">
        <SearchBox placeholder="在此处搜索" dialect="SOURCE_DATA" v-model:value="querySchema.queryInputText.value" :schema="querySchema.schema.value" :time-cost="status.timeCost"/>
        <separator/>
        <DataRouter :state="state" @navigate="navigateTo"/>
        <Button class="flex-item no-grow-shrink" icon="plus" square @click="sourceDataEditor.create()"/>
    </BrowserTeleport>

    <PaneLayout scope-name="source-data" :show-pane="paneState.opened.value">
        <template #pane>
            <SourceDataDetailPane v-if="paneState.mode.value === 'detail'" @close="paneState.closeView()"/>
        </template>

        <VirtualRowView :row-height="40" :padding="6" :metrics="data.metrics" :state="state" @update:state="setState">
            <SourceDataListItem v-for="i in resultWithKey" :key="i.key" :item="i.item"
                                :selected="paneState.detailPath.value?.sourceId === i.identity.sourceId && paneState.detailPath.value?.sourceSite === i.identity.sourceSite"
                                @click="paneState.openDetailView(i.identity)"
                                @contextmenu="popupMenu.popup(i.identity)"/>
        </VirtualRowView>

        <LoadingScreen/>
    </PaneLayout>
</template>
