<script setup lang="ts">
import { PlayBoard } from "@/components/data"
import { ElementPopupMenu } from "@/components/interaction"
import { Button, Separator, OptionButtons } from "@/components/universal"
import { SideLayout, SideBar, TopBarCollapseLayout, MiddleLayout } from "@/components/layout"
import { ZoomController } from "@/components-business/top-bar"
import { ViewStackBackButton } from "@/components-module/view-stack"
import { Illust } from "@/functions/http-client/api/illust"
import { AllSlice, ListIndexSlice, SliceOrPath } from "@/functions/fetch"
import { MenuItem, usePopupMenu } from "@/modules/popup-menu"
import { useAssets } from "@/functions/app"
import { installImageViewContext } from "@/services/view-stack/image"
import SideBarDetailInfo from "./SideBarDetailInfo.vue"
import SideBarRelatedItems from "./SideBarRelatedItems.vue"
import SideBarSourceData from "./SideBarSourceData.vue"

const props = defineProps<{
    data: SliceOrPath<Illust, AllSlice<Illust> | ListIndexSlice<Illust>, number[]>
    modifiedCallback?: (illustId: number) => void
}>()

const {
    navigator: { metrics, subMetrics, prev, next },
    target: { id, data, toggleFavorite, deleteItem, openInNewWindow },
    sideBar: { tabType },
    playBoard: { zoomEnabled, zoomValue }
} = installImageViewContext(props.data, props.modifiedCallback)

const { assetsUrl } = useAssets()

const sideBarButtonItems = [
    {value: "info", label: "项目信息", icon: "info"},
    {value: "related", label: "相关项目", icon: "dice-d6"},
    {value: "source", label: "来源信息", icon: "file-invoice"},
]

const externalMenuItems = <MenuItem<undefined>[]>[
    {type: "normal", label: "在新窗口中打开"},
    {type: "separator"},
    {type: "normal", label: "在预览中打开"},
    {type: "normal", label: "在文件夹中显示"},
    {type: "separator"},
    {type: "normal", label: "导出"}
]

const popupMenu = usePopupMenu([
    {type: "normal", label: "在新窗口中打开", click: openInNewWindow},
    {type: "separator"},
    {type: "normal", label: "加入剪贴板"},
    {type: "separator"},
    {type: "normal", label: "添加到目录"},
    {type: "normal", label: "添加到\"X\""},
    {type: "normal", label: "添加到临时目录"},
    {type: "separator"},
    {type: "normal", label: "导出"},
    {type: "separator"},
    {type: "normal", label: "删除此项目", click: deleteItem}
])

</script>

<template>
    <SideLayout>
        <template #side>
            <SideBar>
                <SideBarDetailInfo v-if="tabType === 'info'"/>
                <SideBarRelatedItems v-else-if="tabType === 'related'"/>
                <SideBarSourceData v-else-if="tabType === 'source'"/>
                <template #bottom>
                    <OptionButtons :items="sideBarButtonItems" v-model:value="tabType"/>
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
                            <Button :ref="setEl" expose-el square icon="external-link-alt" @click="popup"/>
                        </ElementPopupMenu>
                        <Separator/>
                        <ZoomController :disabled="!zoomEnabled" v-model:value="zoomValue"/>
                    </template>
                </MiddleLayout>
            </template>

            <PlayBoard v-if="data !== null" :src="assetsUrl(data.file)" :zoom-value="zoomValue" v-model:zoom-enabled="zoomEnabled" @contextmenu="popupMenu.popup()"/>
        </TopBarCollapseLayout>
    </SideLayout>
</template>

<style module lang="sass">
.navigator
    padding: 0 0.25rem
    min-width: 4rem
    text-align: center
</style>
