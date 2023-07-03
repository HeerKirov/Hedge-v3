<script setup lang="ts">
import { computed } from "vue"
import { Button, Separator } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { SideLayout, SideBar, TopBarLayout, MiddleLayout, PaneLayout, Flex } from "@/components/layout"
import { DataRouter, FitTypeButton, ColumnNumButton } from "@/components-business/top-bar"
import { IllustImageDataset } from "@/components-module/data"
import { IllustDetailPane, StagingPostButton } from "@/components-module/common"
import { ViewStackBackButton } from "@/components-module/view-stack"
import { Book, BookImage } from "@/functions/http-client/api/book"
import { SingletonSlice, SliceOrPath } from "@/functions/fetch"
import { MenuItem, useDynamicPopupMenu } from "@/modules/popup-menu"
import { installBookViewContext } from "@/services/view-stack/book"
import SideBarDetailInfo from "./SideBarDetailInfo.vue"

const props = defineProps<{
    sliceOrPath: SliceOrPath<Book, SingletonSlice<Book>, number>
}>()

const {
    target: { id, data, deleteItem, toggleFavorite },
    listview: { paginationData },
    listviewController: { viewMode, fitType, columnNum, editableLockOn },
    selector: { selected, lastSelected, update: updateSelect },
    paneState,
    operators
} = installBookViewContext(props.sliceOrPath)

const ellipsisMenuItems = computed(() => <MenuItem<undefined>[]>[
    {type: "checkbox", label: "显示信息预览", checked: paneState.visible.value, click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "radio", checked: viewMode.value === "row", label: "列表模式", click: () => viewMode.value = "row"},
    {type: "radio", checked: viewMode.value === "grid", label: "网格模式", click: () => viewMode.value = "grid"},
    {type: "separator"},
    {type: "normal", label: "删除此画集", click: deleteItem}
])

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
    {type: "normal", label: "暂存", click: operators.addToStagingPost},
    operators.stagingPostCount.value > 0 && editableLockOn.value
        ? {type: "normal", label: `将暂存的${operators.stagingPostCount.value}项添加到此处`, click: operators.popStagingPost}
        : {type: "normal", label: "将暂存的项添加到此处", enabled: false},
    {type: "separator"},
    {type: "normal", label: "创建图像集合", click: operators.createCollection},
    {type: "normal", label: "创建画集…", click: operators.createBook},
    {type: "normal", label: "编辑关联组", click: operators.editAssociate},
    {type: "normal", label: "添加到目录…", click: operators.addToFolder},
    {type: "normal", label: "克隆图像属性…", click: operators.cloneImage},
    {type: "separator"},
    {type: "normal", label: "导出", click: operators.exportItem},
    {type: "separator"},
    {type: "normal", label: "删除项目", click: operators.deleteItem},
    {type: "normal", label: "从画集移除此项目", click: i => operators.removeItemFromBook(i, id.value!) }
])

</script>

<template>
    <SideLayout>
        <template #side>
            <SideBar>
                <SideBarDetailInfo/>

                <template #bottom>
                    <Flex horizontal="right">
                        <Separator size="large"/>
                        <StagingPostButton/>
                    </Flex>
                </template>
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
                        <Button square :mode="editableLockOn ? 'filled' : undefined" :type="editableLockOn ? 'danger' : undefined" :icon="editableLockOn ? 'lock-open' : 'lock'" @click="editableLockOn = !editableLockOn"/>
                        <Separator/>
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
                <IllustImageDataset :data="paginationData.data" :query-instance="paginationData.proxy"
                                    :view-mode="viewMode" :fit-type="fitType" :column-num="columnNum" draggable :droppable="editableLockOn"
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
