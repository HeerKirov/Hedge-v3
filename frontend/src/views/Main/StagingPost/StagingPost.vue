<script setup lang="ts">
import { computed } from "vue"
import { Button } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { TopBarLayout, MiddleLayout, PaneLayout } from "@/components/layout"
import { DataRouter, FitTypeButton, ColumnNumButton } from "@/components-business/top-bar"
import { StagingPostDataset } from "@/components-module/data"
import { IllustDetailPane } from "@/components-module/common"
import { useStagingPostContext } from "@/services/main/staging-post"
import { MenuItem, useDynamicPopupMenu } from "@/modules/popup-menu"
import { StagingPostImage } from "@/functions/http-client/api/staging-post"

const { 
    paneState,
    listview: { paginationData },
    selector: { selected, lastSelected, update: updateSelect },
    listviewController: { viewMode, fitType, columnNum },
    operators
} = useStagingPostContext()

const ellipsisMenuItems = computed(() => <MenuItem<undefined>[]>[
    {type: "checkbox", label: "显示信息预览", checked: paneState.visible.value, click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "radio", checked: viewMode.value === "row", label: "列表模式", click: () => viewMode.value = "row"},
    {type: "radio", checked: viewMode.value === "grid", label: "网格模式", click: () => viewMode.value = "grid"},
    {type: "separator"},
    {type: "normal", label: "清空暂存区", click: operators.clear}
])

const menu = useDynamicPopupMenu<StagingPostImage>(illust => [
    {type: "normal", label: "查看详情", click: i => operators.openDetailByClick(i.id)},
    {type: "normal", label: "在新窗口中打开", click: operators.openInNewWindow},
    {type: "separator"},
    {type: "checkbox", checked: paneState.visible.value, label: "显示信息预览", click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    illust.favorite
        ? {type: "normal", label: "取消标记为收藏", click: i => operators.modifyFavorite(i, false)}
        : {type: "normal", label: "标记为收藏", click: i => operators.modifyFavorite(i, true)},
    {type: "separator"},
    {type: "normal", label: "创建图像集合", click: operators.createCollection},
    {type: "normal", label: "创建画集…", click: operators.createBook},
    {type: "normal", label: "编辑关联组", click: operators.editAssociate},
    {type: "normal", label: "添加到目录…", click: operators.addToFolder},
    {type: "normal", label: "克隆图像属性…", click: operators.cloneImage},
    {type: "separator"},
    {type: "normal", label: "导出", click: operators.exportItem},
    {type: "separator"},
    {type: "normal", label: "从暂存区移除此项目", click: operators.removeOne}
])

</script>

<template>
    <TopBarLayout>
        <template #top-bar>
            <MiddleLayout>
                <template #left>
                    <span class="ml-2 is-font-size-large">暂存区</span>
                </template>
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

        <PaneLayout :show-pane="paneState.visible.value">
            <div v-if="paginationData.data.metrics.total !== undefined && paginationData.data.metrics.total <= 0" class="h-100 has-text-centered">
                <p class="secondary-text"><i>暂存区为空</i></p>
            </div>
            <StagingPostDataset v-else :data="paginationData.data" :query-instance="paginationData.proxy"
                                :view-mode="viewMode" :fit-type="fitType" :column-num="columnNum"
                                :selected="selected" :last-selected="lastSelected" :selected-count-badge="!paneState.visible.value"
                                @data-update="paginationData.dataUpdate" @select="updateSelect" @contextmenu="menu.popup($event)"/>

            <template #pane>
                <IllustDetailPane :state="paneState.state.value" @close="paneState.visible.value = false"/>
            </template>
        </PaneLayout>
    </TopBarLayout>
</template>