<script setup lang="ts">
import { Button } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { BrowserTeleport } from "@/components/logical"
import { PaneLayout } from "@/components/layout"
import { DataRouter, FitTypeButton, ColumnNumButton } from "@/components-business/top-bar"
import { StagingPostDataset } from "@/components-module/data"
import { IllustDetailPane } from "@/components-module/common"
import { EmbedPreview } from "@/components-module/preview"
import { useStagingPostContext } from "@/services/main/staging-post"
import { MenuItem, useDynamicPopupMenu } from "@/modules/popup-menu"
import { StagingPostImage } from "@/functions/http-client/api/staging-post"

const { 
    paneState,
    listview: { listview, paginationData: { data, state, setState, navigateTo } },
    selector: { selected, selectedIndex, lastSelected, update: updateSelect },
    listviewController: { viewMode, fitType, columnNum },
    operators
} = useStagingPostContext()

const ellipsisMenuItems = () => <MenuItem<undefined>[]>[
    {type: "checkbox", label: "在侧边栏预览", checked: paneState.visible.value, click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "radio", checked: viewMode.value === "row", label: "列表模式", click: () => viewMode.value = "row"},
    {type: "radio", checked: viewMode.value === "grid", label: "网格模式", click: () => viewMode.value = "grid"},
    {type: "separator"},
    {type: "normal", label: "清空暂存区", click: operators.clear}
]

const menu = useDynamicPopupMenu<StagingPostImage>((illust, { alt }) => [
    {type: "normal", label: "打开", click: i => operators.openDetailByClick(i.id)},
    {type: "normal", label: "在新窗口中打开", click: operators.openInNewWindow},
    {type: "separator"},
    {type: "normal", label: "预览", click: operators.openPreviewBySpace},
    {type: "separator"},
    {type: "checkbox", label: "标记为收藏", checked: illust.favorite, click: i => operators.modifyFavorite(i, !i.favorite)},
    {type: "separator"},
    {type: "normal", label: alt ? "以推荐参数创建集合" : "创建图像集合", click: i => operators.createCollection(i, alt)},
    {type: "normal", label: "创建画集…", click: operators.createBook},
    {type: "normal", label: "编辑关联组", click: operators.editAssociate},
    {type: "normal", label: "添加到目录…", click: operators.addToFolder},
    {type: "normal", label: "图像替换…", click: operators.cloneImage},
    {type: "separator"},
    {type: "normal", label: alt ? "创建相似项查找任务" : "查找相似项", click: i => operators.findSimilarOfImage(i, alt)},
    {type: "normal", label: "导出", click: operators.exportItem},
    {type: "separator"},
    {type: "normal", label: "从暂存区移除此项目", click: operators.removeFromStagingPost}
])

</script>

<template>
    <BrowserTeleport to="top-bar">
        <DataRouter :state="state" @navigate="navigateTo"/>
        <FitTypeButton v-if="viewMode === 'grid'" class="mr-1" v-model:value="fitType"/>
        <ColumnNumButton v-if="viewMode === 'grid'" class="mr-1" v-model:value="columnNum"/>
        <ElementPopupMenu :items="ellipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
            <Button :ref="setEl" class="flex-item no-grow-shrink" square icon="ellipsis-v" @click="popup"/>
        </ElementPopupMenu>
    </BrowserTeleport>

    <PaneLayout scope-name="illust" :show-pane="paneState.visible.value">
        <div v-if="state !== null && state.total <= 0" class="h-100 has-text-centered">
            <p class="secondary-text"><i>暂存区为空</i></p>
        </div>
        <StagingPostDataset v-else :data="data" :state="state" :query-instance="listview.proxy"
                            :view-mode="viewMode" :fit-type="fitType" :column-num="columnNum" draggable droppable
                            :selected="selected" :selected-index="selectedIndex" :last-selected="lastSelected" :selected-count-badge="!paneState.visible.value"
                            @update:state="setState" @navigate="navigateTo" @select="updateSelect" @contextmenu="menu.popup"
                            @dblclick="operators.openDetailByClick" @enter="operators.openDetailByEnter" @space="operators.openPreviewBySpace"
                            @drop="operators.dropToAdd"/>
        <EmbedPreview/>
        <template #pane>
            <IllustDetailPane tab-scope="illust" @close="paneState.visible.value = false"/>
        </template>
    </PaneLayout>
</template>