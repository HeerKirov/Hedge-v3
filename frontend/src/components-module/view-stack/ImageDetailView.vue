<script setup lang="ts">
import { computed } from "vue"
import { PlayBoard } from "@/components/data"
import { ElementPopupMenu } from "@/components/interaction"
import { StagingPostButton } from "@/components-module/common"
import { Button, Separator, OptionButtons } from "@/components/universal"
import { SideLayout, SideBar, TopBarCollapseLayout, MiddleLayout, Flex, FlexItem } from "@/components/layout"
import { IllustTabDetailInfo, IllustTabRelatedItems, IllustTabSourceData } from "@/components-module/common"
import { ZoomController } from "@/components-business/top-bar"
import { ViewStackBackButton } from "@/components-module/view-stack"
import { useAssets } from "@/functions/app"
import { Illust } from "@/functions/http-client/api/illust"
import { AllSlice, ListIndexSlice, SliceOrPath } from "@/functions/fetch"
import { MenuItem, usePopupMenu } from "@/modules/popup-menu"
import { installImageViewContext } from "@/services/view-stack/image"

const props = defineProps<{
    sliceOrPath: SliceOrPath<Illust, number, AllSlice<Illust, number> | ListIndexSlice<Illust, number>, number[]>
    modifiedCallback?: (illustId: number) => void
}>()

const {
    navigator: { metrics, subMetrics, prev, next },
    target: { id, data },
    sideBar: { tabType },
    playBoard: { zoomEnabled, zoomValue },
    operators: { 
        toggleFavorite, deleteItem, openInNewWindow, openInLocalFolder, openInLocalPreference,
        editMetaTag, editSourceData, editAssociate, addToFolder, addToStagingPost, exportItem, recentFolders 
    },
} = installImageViewContext(props.sliceOrPath, props.modifiedCallback)

const { assetsUrl } = useAssets()

const sideBarButtonItems = [
    {value: "info", label: "项目信息", icon: "info"},
    {value: "related", label: "相关内容", icon: "dice-d6"},
    {value: "source", label: "来源数据", icon: "file-invoice"},
]

const externalMenuItems = <MenuItem<undefined>[]>[
    {type: "normal", label: "在新窗口中打开", click: openInNewWindow},
    {type: "separator"},
    {type: "normal", label: "在预览中打开", click: openInLocalPreference},
    {type: "normal", label: "在文件夹中显示", click: openInLocalFolder},
    {type: "separator"},
    {type: "normal", label: "导出", click: exportItem}
]

const popupMenu = usePopupMenu(computed(() => [
    {type: "normal", label: "在新窗口中打开", click: openInNewWindow},
    {type: "separator"},
    {type: "normal", label: "暂存", click: addToStagingPost},
    {type: "separator"},
    {type: "normal", label: "编辑标签", click: editMetaTag},
    {type: "normal", label: "编辑来源数据", enabled: !!data.value?.source, click: editSourceData},
    {type: "normal", label: "编辑关联组", click: editAssociate},
    {type: "normal", label: "添加到目录…", click: addToFolder},
    ...recentFolders.value.map(f => ({type: "normal", label: `添加到目录"${f.fullName}"`, click: f.click} as const)),
    {type: "separator"},
    {type: "normal", label: "导出", click: exportItem},
    {type: "separator"},
    {type: "normal", label: "删除此项目", click: deleteItem}
]))

</script>

<template>
    <SideLayout>
        <template #side>
            <SideBar>
                <KeepAlive>
                    <IllustTabDetailInfo v-if="id !== null && tabType === 'info'" :detail-id="id"/>
                    <IllustTabRelatedItems v-else-if="id !== null && tabType === 'related'" :detail-id="id" type="IMAGE"/>
                    <IllustTabSourceData v-else-if="id !== null && tabType === 'source'" :detail-id="id" type="IMAGE"/>
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

        <TopBarCollapseLayout>
            <template #top-bar>
                <MiddleLayout>
                    <template #left>
                        <ViewStackBackButton/>
                    </template>

                    <Button square icon="angle-left" @click="prev"/>
                    <div :class="$style.navigator">
                        {{metrics.current + 1}} / {{metrics.total}}
                        <p v-if="subMetrics" class="secondary-text">{{subMetrics.current + 1}} / {{subMetrics.total}}</p>
                    </div>
                    <Button square icon="angle-right" @click="next"/>

                    <template #right>
                        <Button square icon="heart" :type="data?.favorite ? 'danger' : 'secondary'" @click="toggleFavorite"/>
                        <Separator/>
                        <ElementPopupMenu :items="externalMenuItems" position="bottom" align="left" v-slot="{ setEl, popup }">
                            <Button :ref="setEl" square icon="external-link-alt" @click="popup"/>
                        </ElementPopupMenu>
                        <Separator/>
                        <ZoomController :disabled="!zoomEnabled" v-model:value="zoomValue"/>
                    </template>
                </MiddleLayout>
            </template>

            <PlayBoard v-if="data !== null" :src="assetsUrl(data.filePath.original)" :zoom-value="zoomValue" v-model:zoom-enabled="zoomEnabled" @contextmenu="popupMenu.popup()"/>
        </TopBarCollapseLayout>
    </SideLayout>
</template>

<style module lang="sass">
.navigator
    padding: 0 0.25rem
    min-width: 4rem
    text-align: center
</style>
