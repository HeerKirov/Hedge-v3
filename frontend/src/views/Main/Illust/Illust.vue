<script setup lang="ts">
import { computed } from "vue"
import { Button } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { IllustImageDataset } from "@/components-module/data"
import { IllustDetailPane } from "@/components-module/common"
import { TopBarLayout, MiddleLayout, PaneLayout } from "@/components/layout"
import { DataRouter, FitTypeButton, ColumnNumButton, SearchInput, QueryNotificationBadge, QueryResult, CollectionModeButton } from "@/components-business/top-bar"
import { Illust } from "@/functions/http-client/api/illust"
import { installIllustContext } from "@/services/main/illust"
import { MenuItem, useDynamicPopupMenu } from "@/modules/popup-menu"

const {
    paneState,
    listview: { paginationData },
    listviewController: { viewMode, fitType, columnNum, collectionMode },
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

const menu = useDynamicPopupMenu<Illust>(illust => [
    {type: "normal", label: "查看详情", click: i => operators.openDetailByClick(i.id)},
    (illust.type === "COLLECTION" || null) && {type: "normal", label: "查看集合详情", click: i => operators.openCollectionDetail(i.id)},
    {type: "normal", label: illust.type === "COLLECTION" ? "在新窗口中打开集合" : "在新窗口中打开", click: operators.openInNewWindow},
    {type: "separator"},
    {type: "checkbox", checked: paneState.visible.value, label: "显示信息预览", click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    illust.favorite
        ? {type: "normal", label: "取消标记为收藏", click: i => operators.modifyFavorite(i, false)}
        : {type: "normal", label: "标记为收藏", click: i => operators.modifyFavorite(i, true)},
    {type: "separator"},
    {type: "normal", label: "暂存", click: operators.addToStagingPost},
    {type: "separator"},
    {type: "normal", label: "创建图像集合", click: operators.createCollection},
    {type: "normal", label: "创建画集…", click: operators.createBook},
    {type: "normal", label: "编辑关联组", click: operators.editAssociate},
    {type: "normal", label: "添加到目录…", click: operators.addToFolder},
    {type: "normal", label: "克隆图像属性…", click: operators.cloneImage},
    {type: "separator"},
    {type: "normal", label: "导出", click: operators.exportItem},
    {type: "separator"},
    {type: "normal", label: illust.type === "COLLECTION" ? "删除集合项目" : "删除项目", click: operators.deleteItem}
])

</script>

<template>
    <TopBarLayout v-model:expanded="querySchema.expanded.value">
        <template #top-bar>
            <MiddleLayout>
                <CollectionModeButton class="mr-1" v-model:value="collectionMode"/>
                <SearchInput placeholder="在此处搜索" v-model:value="querySchema.queryInputText.value" :enable-drop-button="!!querySchema.query.value" v-model:active-drop-button="querySchema.expanded.value"/>
                <QueryNotificationBadge class="ml-1" :schema="querySchema.schema.value" @click="querySchema.expanded.value = true"/>

                <template #right>
                    <DataRouter/>
                    <FitTypeButton v-if="viewMode === 'grid'" class="mr-1" v-model:value="fitType"/>
                    <ColumnNumButton v-if="viewMode === 'grid'" class="mr-1" v-model:value="columnNum"/>
                    <ElementPopupMenu :items="ellipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
                        <Button :ref="setEl" square icon="ellipsis-v" @click="popup"/>
                    </ElementPopupMenu>
                </template>
            </MiddleLayout>
        </template>

        <template #expand>
            <QueryResult :schema="querySchema.schema.value"/>
        </template>

        <PaneLayout :show-pane="paneState.visible.value">
            <IllustImageDataset :data="paginationData.data" :query-instance="paginationData.proxy"
                                :view-mode="viewMode" :fit-type="fitType" :column-num="columnNum" draggable
                                :selected="selected" :last-selected="lastSelected" :selected-count-badge="!paneState.visible.value"
                                @data-update="paginationData.dataUpdate" @select="updateSelect" @contextmenu="menu.popup($event as Illust)"
                                @dblclick="(i, s) => operators.openDetailByClick(i, s)" @enter="operators.openDetailByEnter($event)"/>

            <template #pane>
                <IllustDetailPane :state="paneState.state.value" @close="paneState.visible.value = false"/>
            </template>
        </PaneLayout>
    </TopBarLayout>
</template>
