<script setup lang="ts">
import { computed } from "vue"
import { OptionButtons, Button, Separator } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { SideLayout, SideBar, TopBarLayout, MiddleLayout, PaneLayout, Flex, FlexItem } from "@/components/layout"
import { DataRouter, FitTypeButton, ColumnNumButton } from "@/components-business/top-bar"
import { IllustImageDataset } from "@/components-module/data"
import { IllustDetailPane, StagingPostButton, IllustTabDetailInfo, IllustTabRelatedItems } from "@/components-module/common"
import { ViewStackBackButton } from "@/components-module/view-stack"
import { Illust } from "@/functions/http-client/api/illust"
import { SingletonSlice, SliceOrPath } from "@/functions/fetch"
import { MenuItem, useDynamicPopupMenu } from "@/modules/popup-menu"
import { installCollectionViewContext } from "@/services/view-stack/collection"

const props = defineProps<{
    sliceOrPath: SliceOrPath<Illust, SingletonSlice<Illust>, number>
}>()

const {
    target: { id, data, deleteItem, toggleFavorite },
    sideBar: { tabType },
    listview: { paginationData },
    listviewController: { viewMode, fitType, columnNum, editableLockOn },
    selector: { selected, lastSelected, update: updateSelect },
    paneState,
    operators
} = installCollectionViewContext(props.sliceOrPath)

const sideBarButtonItems = [
    {value: "info", label: "项目信息", icon: "info"},
    {value: "related", label: "相关项目", icon: "dice-d6"}
]

const ellipsisMenuItems = computed(() => <MenuItem<undefined>[]>[
    {type: "checkbox", label: "在侧边栏预览", checked: paneState.visible.value, click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "checkbox", label: "解除编辑锁定", checked: editableLockOn.value, click: () => editableLockOn.value = !editableLockOn.value},
    {type: "separator"},
    {type: "radio", checked: viewMode.value === "row", label: "列表模式", click: () => viewMode.value = "row"},
    {type: "radio", checked: viewMode.value === "grid", label: "网格模式", click: () => viewMode.value = "grid"},
    {type: "separator"},
    {type: "normal", label: "删除此集合", click: deleteItem}
])

const menu = useDynamicPopupMenu<Illust>(illust => [
    {type: "normal", label: "打开", click: i => operators.openDetailByClick(i.id)},
    {type: "normal", label: illust.type === "COLLECTION" ? "在新窗口中打开集合" : "在新窗口中打开", click: operators.openInNewWindow},
    {type: "separator"},
    {type: "normal", label: "预览", click: operators.openPreviewBySpace},
    {type: "checkbox", checked: paneState.visible.value, label: "在侧边栏预览", click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "checkbox", label: "标记为收藏", checked: illust.favorite, click: i => operators.modifyFavorite(i, !i.favorite)},
    {type: "separator"},
    {type: "normal", label: "暂存", click: operators.addToStagingPost},
    operators.stagingPostCount.value > 0
        ? {type: "normal", label: `将暂存的${operators.stagingPostCount.value}项添加到此处`, click: operators.popStagingPost}
        : {type: "normal", label: "将暂存的项添加到此处", enabled: false},
    {type: "separator"},
    {type: "normal", label: "拆分至新集合", click: operators.splitToGenerateNewCollection},
    {type: "normal", label: "创建画集…", click: operators.createBook},
    {type: "normal", label: "编辑关联组", click: operators.editAssociate},
    {type: "normal", label: "添加到目录…", click: operators.addToFolder},
    {type: "normal", label: "克隆图像属性…", click: operators.cloneImage},
    {type: "separator"},
    {type: "normal", label: "导出", click: operators.exportItem},
    {type: "separator"},
    {type: "normal", label: "删除项目", click: operators.deleteItem},
    {type: "normal", label: "从集合移除此项目", click: operators.removeItemFromCollection}
])

</script>

<template>
    <SideLayout>
        <template #side>
            <SideBar>
                <KeepAlive>
                    <IllustTabDetailInfo v-if="id !== null && tabType === 'info'" :detail-id="id"/>
                    <IllustTabRelatedItems v-else-if="id !== null && tabType === 'related'" :detail-id="id" type="COLLECTION"/>
                </KeepAlive>

                <template #bottom>
                    <Flex horizontal="stretch">
                        <FlexItem :basis="100" :width="0">
                            <OptionButtons :items="sideBarButtonItems" v-model:value="tabType"/>
                        </FlexItem>
                        <FlexItem :shrink="0" :grow="0">
                            <Separator size="large"/>
                            <StagingPostButton/>
                        </FlexItem>
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
                                    @data-update="paginationData.dataUpdate" @select="updateSelect" @contextmenu="menu.popup($event as Illust)"
                                    @dblclick="operators.openDetailByClick($event)" @enter="operators.openDetailByEnter($event)" @space="operators.openPreviewBySpace()"
                                    @drop="(a, b, c) => operators.dataDrop(a, b, c)"/>

                <template #pane>
                    <IllustDetailPane @close="paneState.visible.value = false"/>
                </template>
            </PaneLayout>
        </TopBarLayout>
    </SideLayout>
</template>
