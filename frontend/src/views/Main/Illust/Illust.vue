<script setup lang="ts">
import { computed } from "vue"
import { Button } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { IllustImageDataset } from "@/components-module/data"
import { IllustDetailPane } from "@/components-module/common"
import { TopBarLayout, MiddleLayout, PaneLayout } from "@/components/layout"
import { DataRouter, FitTypeButton, ColumnNumButton, SearchInput, QueryNotificationBadge, QueryResult } from "@/components-business/top-bar"
import { installIllustContext } from "@/services/main/illust"
import { MenuItem, usePopupMenu } from "@/modules/popup-menu"

const {
    paneState,
    listview: { listview, paginationData },
    listviewController: { viewMode, fitType, columnNum },
    selector: { selected, lastSelected, update: updateSelect },
    querySchema,
    operators
} = installIllustContext()

const ellipsisMenuItems = computed(() => <MenuItem<undefined>[]>[
    {type: "checkbox", label: "显示信息预览", checked: paneState.visible.value, click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "radio", checked: viewMode.value === "row", label: "列表模式", click: () => viewMode.value = "row"},
    {type: "radio", checked: viewMode.value === "grid", label: "网格模式", click: () => viewMode.value = "grid"}
])

const menu = usePopupMenu<unknown>([])

</script>

<template>
    <TopBarLayout v-model:expanded="querySchema.expanded.value">
        <template #top-bar>
            <MiddleLayout>
                <SearchInput placeholder="在此处搜索" v-model:value="querySchema.queryInputText.value" :enable-drop-button="!!querySchema.query.value" v-model:active-drop-button="querySchema.expanded.value"/>
                <QueryNotificationBadge class="ml-1" :schema="querySchema.schema.value" @click="querySchema.expanded.value = true"/>

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

        <template #expand>
            <QueryResult :schema="querySchema.schema.value"/>
        </template>

        <PaneLayout :show-pane="paneState.visible.value">
            <IllustImageDataset :data="paginationData.data" :query-instance="paginationData.proxy"
                                :view-mode="viewMode" :fit-type="fitType" :column-num="columnNum"
                                :selected="selected" :last-selected="lastSelected" :selected-count-badge="!paneState.visible.value"
                                @data-update="paginationData.dataUpdate" @select="updateSelect" @contextmenu="menu.popup($event)"/>

            <template #pane>
                <IllustDetailPane :state="paneState.state.value" @close="paneState.visible.value = false"/>
            </template>
        </PaneLayout>
    </TopBarLayout>
</template>
