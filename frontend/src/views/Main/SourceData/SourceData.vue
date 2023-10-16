<script setup lang="ts">
import { computed } from "vue"
import { Button } from "@/components/universal"
import { VirtualRowView } from "@/components/data"
import { TopBarLayout, PaneLayout, MiddleLayout } from "@/components/layout"
import { SearchInput, DataRouter, QueryNotificationBadge, QueryResult } from "@/components-business/top-bar"
import { useDialogService } from "@/components-module/dialog"
import { usePopupMenu } from "@/modules/popup-menu"
import { installSourceDataContext } from "@/services/main/source-data"
import SourceDataListItem from "./SourceDataListItem.vue"
import SourceDataDetailPane from "./SourceDataDetailPane.vue"

const { paneState, listview: { paginationData }, querySchema, operators } = installSourceDataContext()

const resultWithKey = computed(() => paginationData.data.result.map(item => ({item, key: `${item.sourceSite}-${item.sourceId}`, identity: {sourceSite: item.sourceSite, sourceId: item.sourceId}})))

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
    <TopBarLayout v-model:expanded="querySchema.expanded.value">
        <template #top-bar>
            <MiddleLayout>
                <SearchInput placeholder="在此处搜索" v-model:value="querySchema.queryInputText.value" :enable-drop-button="!!querySchema.query.value" v-model:active-drop-button="querySchema.expanded.value"/>
                <QueryNotificationBadge class="ml-1" :schema="querySchema.schema.value" @click="querySchema.expanded.value = true"/>

                <template #right>
                    <DataRouter/>
                    <Button icon="plus" square @click="sourceDataEditor.create()"/>
                </template>
            </MiddleLayout>
        </template>

        <template #expand>
            <QueryResult :schema="querySchema.schema.value"/>
        </template>

        <PaneLayout :show-pane="paneState.opened.value">
            <template #pane>
                <SourceDataDetailPane v-if="paneState.mode.value === 'detail'" @close="paneState.closeView()"/>
            </template>

            <VirtualRowView :row-height="40" :padding="6" :buffer-size="10" v-bind="paginationData.data.metrics" @update="paginationData.dataUpdate">
                <SourceDataListItem v-for="i in resultWithKey" :key="i.key"
                                    :item="i.item"
                                    :selected="paneState.detailPath.value?.sourceId === i.identity.sourceId && paneState.detailPath.value?.sourceSite === i.identity.sourceSite"
                                    @click="paneState.openDetailView(i.identity)"
                                    @contextmenu="popupMenu.popup(i.identity)"/>
            </VirtualRowView>
        </PaneLayout>
    </TopBarLayout>
</template>
