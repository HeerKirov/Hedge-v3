<script setup lang="ts">
import { computed, watch } from "vue"
import { BrowserNavMenu, NavContextMenuDefinition, MenuScope, NavMenuItem, NavMenuItems, NavMenuItemsByHistory } from "@/components/interaction"
import { Button, Separator } from "@/components/universal"
import { SideBar } from "@/components/layout"
import { BackgroundTaskButton, StagingPostButton } from "@/components-module/common"
import { windowManager } from "@/modules/window"
import { MenuItem } from "@/modules/popup-menu"
import { useActivateTabRoute, useBrowserTabs } from "@/modules/browser"
import { useDarwinWindowed } from "@/functions/app"
import { useFetchReactive, usePostFetchHelper, usePostPathFetchHelper } from "@/functions/fetch"
import { useHomepageState } from "@/services/main/homepage"
import { useNavigationRecords } from "@/services/base/side-nav-records"

const { newTab } = useBrowserTabs()
const { hasHistories, hasForwards, routeBack, routeForward } = useActivateTabRoute()

const { data: homepageState } = useHomepageState()

const similarityCountBadge = computed(() => homepageState.value?.findSimilarCount || null)

const importCountBadge = computed(() => {
    if(homepageState.value === undefined) {
        return null
    }else if(homepageState.value.importImageErrorCount <= 0) {
        return homepageState.value.importImageCount || null
    }else if(homepageState.value.importImageCount <= 0) {
        return {count: homepageState.value.importImageErrorCount, type: "danger" as const}
    }else{
        return [{count: homepageState.value.importImageCount, type: "std" as const}, {count: homepageState.value.importImageErrorCount, type: "danger" as const}]
    }
})

const { data: pins } = useFetchReactive({
    get: client => client.folder.pin.list,
    eventFilter: "entity/folder/pin/changed"
})

const fetchSetPin = usePostPathFetchHelper(client => client.folder.pin.set)
const fetchUnsetPin = usePostFetchHelper(client => client.folder.pin.unset)

watch(pins, pins => navigationRecords.excludes["FolderDetail"] = pins?.map(i => i.id.toString()) ?? [])

const navigationRecords = useNavigationRecords()

const hasDarwinBorder = useDarwinWindowed()

const partitionContextMenu: NavContextMenuDefinition = () => <MenuItem<undefined>[]>[{type: "normal", label: "今天", click: () => newTab({routeName: "PartitionDetail", path: homepageState.value?.today})}]

const authorContextMenu: NavContextMenuDefinition = () => <MenuItem<undefined>[]>[{type: "normal", label: "新建作者", click: () => newTab({routeName: "AuthorCreate"})}]

const topicContextMenu: NavContextMenuDefinition = () => <MenuItem<undefined>[]>[{type: "normal", label: "新建主题", click: () => newTab({routeName: "TopicCreate"})}]

const folderRecentContextMenu: NavContextMenuDefinition = ctx => <MenuItem<undefined>[]>[{type: "normal", label: "固定到侧边栏", click: () => fetchSetPin(ctx.routePath as number, undefined)}]

const folderPinnedContextMenu: NavContextMenuDefinition = ctx => <MenuItem<undefined>[]>[{type: "normal", label: "取消固定到侧边栏", click: () => fetchUnsetPin(ctx.routePath as number)}]

</script>

<template>
    <SideBar :scrollable="false">
        <template #top-bar>
            <template v-if="hasHistories || hasForwards">
                <Button :class="{'no-app-region': true, 'opacity-50': !hasHistories}" square icon="arrow-left" :disabled="!hasHistories" @click="routeBack"/>
                <Button :class="{'no-app-region': true, 'opacity-50': !hasForwards}" square icon="arrow-right" :disabled="!hasForwards" @click="routeForward"/>
            </template>
        </template>

        <div id="side-bar" :class="$style['side-bar-area']">
            <div :class="$style['std-menu']">
                <BrowserNavMenu>
                    <NavMenuItem route-name="Home" label="主页" icon="house"/>
                    <MenuScope id="main" label="浏览">
                        <NavMenuItem route-name="Illust" label="图库" icon="search"/>
                        <NavMenuItem route-name="Partition" label="分区" icon="calendar-alt" :context-menu="partitionContextMenu">
                            <NavMenuItemsByHistory route-name="PartitionDetail"/>
                        </NavMenuItem>
                        <NavMenuItem route-name="Book" label="画集" icon="clone">
                            <NavMenuItemsByHistory route-name="BookDetail"/>
                        </NavMenuItem>
                    </MenuScope>
                    <MenuScope id="meta" label="元数据">
                        <NavMenuItem route-name="Author" label="作者" icon="user-tag" :context-menu="authorContextMenu">
                            <NavMenuItemsByHistory route-name="AuthorDetail"/>
                        </NavMenuItem>
                        <NavMenuItem route-name="Topic" label="主题" icon="hashtag" :context-menu="topicContextMenu">
                            <NavMenuItemsByHistory route-name="TopicDetail"/>
                        </NavMenuItem>
                        <NavMenuItem route-name="Tag" label="标签" icon="tag"/>
                        <NavMenuItem route-name="SourceData" label="来源数据" icon="file-invoice"/>
                    </MenuScope>
                    <MenuScope id="tool" label="工具箱">
                        <NavMenuItem route-name="Import" label="导入" icon="plus-square" :badge="importCountBadge"/>
                        <NavMenuItem route-name="FindSimilar" label="相似项目" icon="grin-squint" :badge="similarityCountBadge"/>
                        <NavMenuItem route-name="Trash" label="已删除" icon="trash-can"/>
                    </MenuScope>
                    <MenuScope id="folder" label="目录">
                        <NavMenuItem route-name="Folder" label="所有目录" icon="archive"/>
                        <NavMenuItems route-name="FolderDetail" icon="thumbtack" :items="pins" :generator="v => ({key: v.id, label: v.address.join('/'), routePath: v.id})" :context-menu="folderPinnedContextMenu"/>
                        <NavMenuItemsByHistory route-name="FolderDetail" icon="folder" :context-menu="folderRecentContextMenu"/>
                    </MenuScope>
                </BrowserNavMenu>
            </div>
        </div>

        <template #bottom>
            <div class="flex">
                <Button :class="{[$style['darwin-border-button']]: hasDarwinBorder}" square icon="gear" @click="windowManager.openSetting"/>
                <Button class="ml-1" square icon="circle-question-regular" @click="windowManager.openGuide"/>
                <Button class="ml-1" square icon="note-sticky" @click="windowManager.openNote"/>
                <BackgroundTaskButton/>

                <div class="ml-auto flex-item shrink-0">
                    <Separator size="large"/>
                    <StagingPostButton/>
                </div>
            </div>
        </template>
    </SideBar>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.side-bar-area
    position: absolute
    left: 0
    top: 0
    width: 100%
    height: 100%
    .std-menu
        height: 100%
        padding: size.$spacing-1 size.$spacing-2
        overflow-y: auto
        &:not(:last-child)
            display: none

.darwin-border-button
    border-bottom-left-radius: size.$radius-size-very-large
</style>
