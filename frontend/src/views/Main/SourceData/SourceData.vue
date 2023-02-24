<script setup lang="ts">
import { computed } from "vue"
import { Button } from "@/components/universal"
import { VirtualRowView } from "@/components/data"
import { TopBarLayout, PaneLayout, BasePane, MiddleLayout } from "@/components/layout"
import { SearchInput, DataRouter } from "@/components-business/top-bar"
import { useDialogService } from "@/components-module/dialog"
import { usePopupMenu } from "@/modules/popup-menu"
import { installSourceDataContext } from "@/services/main/source-data"
import SourceDataListItem from "./SourceDataListItem.vue"

const { paneState, listview: { queryFilter, paginationData }, operators } = installSourceDataContext()

const resultWithKey = computed(() => paginationData.data.result.map(item => ({item, key: {sourceSite: item.sourceSite, sourceId: item.sourceId}})))

const { sourceDataEditor } = useDialogService()

const popupMenu = usePopupMenu([

])

</script>

<template>
    <TopBarLayout>
        <template #top-bar>
            <MiddleLayout>
                <SearchInput class="ml-1" placeholder="在此处搜索" v-model:value="queryFilter.query"/>

                <template #right>
                    <DataRouter/>
                    <Button icon="plus" square @click="sourceDataEditor.create()"/>
                </template>
            </MiddleLayout>
        </template>

        <PaneLayout :show-pane="paneState.opened.value">
            <template #pane>
                <BasePane @close="paneState.closeView()">

                </BasePane>
            </template>

            <VirtualRowView :row-height="40" :padding="6" :buffer-size="10" v-bind="paginationData.data.metrics" @update="paginationData.dataUpdate">
                <SourceDataListItem v-for="i in resultWithKey" :key="i.key"
                                    :item="i.item"
                                    :selected="paneState.detailPath.value?.sourceId === i.key.sourceId && paneState.detailPath.value?.sourceSite === i.key.sourceSite"
                                    @click="paneState.openDetailView(i.key)"
                                    @contextmenu="popupMenu.popup(i.key)"/>
            </VirtualRowView>
        </PaneLayout>
    </TopBarLayout>
</template>
