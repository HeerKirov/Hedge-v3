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
    listview: { listview, paginationData: { data, state, setState, navigateTo } },
    selector: { selected, lastSelected, update: updateSelect },
    listviewController: { viewMode, fitType, columnNum },
    operators
} = useStagingPostContext()

const ellipsisMenuItems = computed(() => <MenuItem<undefined>[]>[
    {type: "checkbox", label: "在侧边栏预览", checked: paneState.visible.value, click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "radio", checked: viewMode.value === "row", label: "列表模式", click: () => viewMode.value = "row"},
    {type: "radio", checked: viewMode.value === "grid", label: "网格模式", click: () => viewMode.value = "grid"},
    {type: "separator"},
    {type: "normal", label: "清空暂存区", click: operators.clear}
])

const menu = useDynamicPopupMenu<StagingPostImage>(illust => [
    {type: "normal", label: "打开", click: i => operators.openDetailByClick(i.id)},
    {type: "normal", label: "在新窗口中打开", click: operators.openInNewWindow},
    {type: "separator"},
    {type: "normal", label: "预览", click: operators.openPreviewBySpace},
    {type: "checkbox", checked: paneState.visible.value, label: "在侧边栏预览", click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "checkbox", label: "标记为收藏", checked: illust.favorite, click: i => operators.modifyFavorite(i, !i.favorite)},
    {type: "separator"},
    {type: "normal", label: "创建图像集合", click: operators.createCollection},
    {type: "normal", label: "创建画集…", click: operators.createBook},
    {type: "normal", label: "编辑关联组", click: operators.editAssociate},
    {type: "normal", label: "添加到目录…", click: operators.addToFolder},
    {type: "normal", label: "克隆图像属性…", click: operators.cloneImage},
    {type: "separator"},
    {type: "normal", label: "查找相似项", click: operators.findSimilarOfImage},
    {type: "normal", label: "导出", click: operators.exportItem},
    {type: "separator"},
    {type: "normal", label: "从暂存区移除此项目", click: operators.removeFromStagingPost}
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
                    <DataRouter :state="state" @navigate="navigateTo"/>
                    <FitTypeButton v-if="viewMode === 'grid'" class="mr-1" v-model:value="fitType"/>
                    <ColumnNumButton v-if="viewMode === 'grid'" class="mr-1" v-model:value="columnNum"/>
                    <ElementPopupMenu :items="ellipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
                        <Button :ref="setEl" square icon="ellipsis-v" @click="popup"/>
                    </ElementPopupMenu>
                </template>
            </MiddleLayout>
        </template>

        <PaneLayout :show-pane="paneState.visible.value">
            <div v-if="state !== null && state.total <= 0" class="h-100 has-text-centered">
                <p class="secondary-text"><i>暂存区为空</i></p>
            </div>
            <StagingPostDataset v-else :data="data" :state="state" :query-instance="listview.proxy"
                                :view-mode="viewMode" :fit-type="fitType" :column-num="columnNum" draggable droppable
                                :selected="selected" :last-selected="lastSelected" :selected-count-badge="!paneState.visible.value"
                                @update:state="setState" @navigate="navigateTo" @select="updateSelect" @contextmenu="menu.popup($event)"
                                @dblclick="(i, s) => operators.openDetailByClick(i, s)" @enter="operators.openDetailByEnter($event)" @space="operators.openPreviewBySpace()"
                                @drop="operators.dropToAdd"/>

            <template #pane>
                <IllustDetailPane @close="paneState.visible.value = false"/>
            </template>
        </PaneLayout>
    </TopBarLayout>
</template>