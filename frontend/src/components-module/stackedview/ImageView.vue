<script setup lang="ts">
import { computed } from "vue"
import { PlayBoard } from "@/components/data"
import { ElementPopupMenu } from "@/components/interaction"
import { Button, Separator } from "@/components/universal"
import { PaneLayout, BasePane, TopBarCollapseLayout, MiddleLayout, Flex, FlexItem } from "@/components/layout"
import { IllustDetailTab, } from "@/components-module/common"
import { ZoomController } from "@/components-business/top-bar"
import {useAppEnv, useAssets, useDarwinWindowed} from "@/functions/app"
import { Illust } from "@/functions/http-client/api/illust"
import { AllSlice, ListIndexSlice, SliceOrPath } from "@/functions/fetch"
import { MenuItem, usePopupMenu } from "@/modules/popup-menu"
import { useImageViewContext } from "@/components-module/stackedview/image"
import BackButton from "./BackButton.vue"
import CollapsedButton from "./CollapsedButton.vue"

const props = defineProps<{
    sliceOrPath: SliceOrPath<Illust, number, AllSlice<Illust, number> | ListIndexSlice<Illust, number>, number[]>
    modifiedCallback?: (illustId: number) => void
}>()

const {
    navigator: { metrics, subMetrics, prev, next },
    target: { id, data },
    sideBar: { collapsed },
    playBoard: { zoomEnabled, zoomValue },
    operators: { 
        toggleFavorite, deleteItem, openInNewWindow, openInLocalFolder, openInLocalPreference,
        editMetaTag, editSourceData, editAssociate, addToFolder, addToStagingPost, exportItem, recentFolders 
    },
} = useImageViewContext(props.sliceOrPath, props.modifiedCallback)

const { assetsUrl } = useAssets()

const { platform } = useAppEnv()

const hasDarwinBorder = useDarwinWindowed()

const hasWinButton = platform !== "darwin"

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
    <PaneLayout scope-name="stacked-view" :show-pane="!collapsed">
        <TopBarCollapseLayout :collapsed="collapsed" is-embed>
            <template #top-bar>
                <MiddleLayout>
                    <template #left>
                        <BackButton/>
                    </template>

                    <Button square icon="angle-left" @click="prev"/>
                    <div :class="$style.navigator">
                        {{metrics.current + 1}} / {{metrics.total}}
                        <p v-if="subMetrics" class="secondary-text">{{subMetrics.current + 1}} / {{subMetrics.total}}</p>
                    </div>
                    <Button square icon="angle-right" @click="next"/>

                    <template #right>
                        <template v-if="hasWinButton">
                            <ElementPopupMenu :items="externalMenuItems" position="bottom" align="left" v-slot="{ setEl, popup, attrs }">
                              <Button :ref="setEl" v-bind="attrs" square icon="external-link-alt" @click="popup"/>
                            </ElementPopupMenu>
                            <ZoomController :disabled="!zoomEnabled" v-model:value="zoomValue"/>
                            <Separator/>
                            <Button square icon="fa-up-right-and-down-left-from-center" @click="collapsed = !collapsed"/>
                        </template>
                    </template>
                </MiddleLayout>
            </template>

            <PlayBoard v-if="data !== null" :src="assetsUrl(data.filePath.original)" :zoom-value="zoomValue" v-model:zoom-enabled="zoomEnabled" immersive @contextmenu="popupMenu.popup()"/>
            <CollapsedButton v-if="collapsed" :hasWinButton :hasDarwinBorder @click:collapsed="collapsed = $event"/>
            <ZoomController v-if="collapsed" class="is-display-none" :disabled="!zoomEnabled" v-model:value="zoomValue"/>
        </TopBarCollapseLayout>

        <template #pane>
            <BasePane :show-close-button="false">
                <template #title>
                    <Flex :class="{[$style['right-top-bar']]: true, [$style['has-darwin-border']]: hasDarwinBorder}" horizontal="stretch" :shrink="0">
                        <Button square icon="heart" :type="data?.favorite ? 'danger' : 'secondary'" @click="toggleFavorite"/>
                        <template v-if="!hasWinButton">
                            <FlexItem :shrink="1" :width="100"><div/></FlexItem>
                            <ElementPopupMenu :items="externalMenuItems" position="bottom" align="left" v-slot="{ setEl, popup, attrs }">
                              <Button :ref="setEl" v-bind="attrs"  class="flex-item no-shrink" square icon="external-link-alt" @click="popup"/>
                            </ElementPopupMenu>
                            <ZoomController :disabled="!zoomEnabled" v-model:value="zoomValue"/>
                            <Separator/>
                            <Button class="flex-item no-shrink" square icon="fa-up-right-and-down-left-from-center" @click="collapsed = !collapsed"/>
                        </template>
                    </Flex>
                </template>

                <template #top>
                    <Separator :class="$style['right-top-bar-border']" direction="horizontal" :spacing="0"/>
                </template>

                <IllustDetailTab v-if="id" :detail-id="id" type="IMAGE"/>
            </BasePane>
        </template>
    </PaneLayout>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.navigator
    padding: 0 0.25rem
    min-width: 4rem
    text-align: center

.right-top-bar-border
    position: absolute
    width: 100%
    right: 0
    top: #{size.$title-bar-height - 1px}

.right-top-bar
    -webkit-app-region: drag
    > *
        -webkit-app-region: none
    &.has-darwin-border > button:last-child
        border-top-right-radius: size.$radius-size-darwin
</style>
