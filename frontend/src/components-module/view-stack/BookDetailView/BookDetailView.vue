<script setup lang="ts">
import { computed } from "vue"
import { Button, Separator } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { SideLayout, SideBar, TopBarLayout, MiddleLayout, PaneLayout } from "@/components/layout"
import { DataRouter, FitTypeButton, ColumnNumButton } from "@/components-business/top-bar"
import { IllustImageDataset } from "@/components-module/data"
import { IllustDetailPane } from "@/components-module/common"
import { ViewStackBackButton } from "@/components-module/view-stack"
import { useDialogService } from "@/components-module/dialog"
import { Book, BookImage } from "@/functions/http-client/api/book"
import { SingletonSlice, SliceOrPath } from "@/functions/fetch"
import { MenuItem, useDynamicPopupMenu } from "@/modules/popup-menu"
import { installBookViewContext } from "@/services/view-stack/book"
import SideBarDetailInfo from "./SideBarDetailInfo.vue"

const props = defineProps<{
    data: SliceOrPath<Book, SingletonSlice<Book>, number>
}>()

const {
    target: { id, data, deleteItem, toggleFavorite },
    listview: { listview, paginationData },
    listviewController: { viewMode, fitType, columnNum },
    selector: { selected, lastSelected, update: updateSelect },
    paneState,
    operators
} = installBookViewContext(props.data)

const dialog = useDialogService()

const ellipsisMenuItems = computed(() => <MenuItem<undefined>[]>[
    {type: "checkbox", label: "显示信息预览", checked: paneState.visible.value, click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "radio", checked: viewMode.value === "row", label: "列表模式", click: () => viewMode.value = "row"},
    {type: "radio", checked: viewMode.value === "grid", label: "网格模式", click: () => viewMode.value = "grid"}
])

// TODO 完成illust右键菜单的功能 (剪贴板，关联组，导出)
const menu = useDynamicPopupMenu<BookImage>(bookImage => [
    {type: "normal", label: "查看详情", click: i => operators.openDetailByClick(i.id)},
    {type: "normal", label: "在新窗口中打开", click: operators.openInNewWindow},
    {type: "separator"},
    {type: "checkbox", checked: paneState.visible.value, label: "显示信息预览", click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    bookImage.favorite
        ? {type: "normal", label: "取消标记为收藏", click: i => operators.modifyFavorite(i, false)}
        : {type: "normal", label: "标记为收藏", click: i => operators.modifyFavorite(i, true)},
    {type: "separator"},
    {type: "normal", label: "加入剪贴板"},
    {type: "separator"},
    {type: "normal", label: "拆分至新集合", click: operators.splitToGenerateNewCollection},
    {type: "normal", label: "创建画集…", click: operators.createBook},
    {type: "normal", label: "创建关联组"},
    {type: "normal", label: "添加到目录…", click: operators.addToFolder},
    {type: "normal", label: "克隆图像属性…", click: operators.cloneImage},
    {type: "separator"},
    {type: "normal", label: "导出"},
    {type: "separator"},
    {type: "normal", label: "删除项目", click: operators.deleteItem},
    {type: "normal", label: "从集合移除此项目", click: operators.removeItemFromCollection}
])

</script>

<template>
    <SideLayout>
        <template #side>
            <SideBar>
                <SideBarDetailInfo/>
            </SideBar>
        </template>

        <TopBarLayout>
            <template #top-bar>
                <MiddleLayout>
                    <template #left>
                        <ViewStackBackButton/>
                    </template>

                    <template #right>
                        <Button square icon="heart" :type="data?.favorite ? 'danger' : 'secondary'" @click="toggleFavorite"/>
                        <Separator/>
                        <DataRouter/>
                        <FitTypeButton v-if="viewMode === 'grid'" class="mr-1" v-model:value="fitType"/>
                        <ColumnNumButton v-if="viewMode === 'grid'" class="mr-1" v-model:value="columnNum"/>
                        <ElementPopupMenu :items="ellipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
                            <Button :ref="setEl" expose-el square icon="ellipsis-v" @click="popup"/>
                        </ElementPopupMenu>
                    </template>
                </MiddleLayout>
            </template>

            <PaneLayout :show-pane="paneState.visible.value">
                <IllustImageDataset :data="paginationData.data" :query-instance="paginationData.proxy"
                                    :view-mode="viewMode" :fit-type="fitType" :column-num="columnNum" draggable droppable
                                    :selected="selected" :last-selected="lastSelected" :selected-count-badge="!paneState.visible.value"
                                    @data-update="paginationData.dataUpdate" @select="updateSelect" @contextmenu="menu.popup($event as BookImage)"
                                    @dblclick="operators.openDetailByClick($event)" @enter="operators.openDetailByEnter($event)" @drop="(a, b, c) => operators.dataDrop(a, b, c)"/>

                <template #pane>
                    <IllustDetailPane :state="paneState.state.value" @close="paneState.visible.value = false"/>
                </template>
            </PaneLayout>
        </TopBarLayout>
    </SideLayout>
</template>
