<script setup lang="ts">
import { computed, watch } from "vue"
import { Menu } from "@/components/interaction"
import { Button, Separator } from "@/components/universal"
import { Flex, FlexItem, SideBar } from "@/components/layout"
import { StagingPostButton } from "@/components-module/common"
import { windowManager } from "@/modules/window"
import { useActivateTabRoute } from "@/modules/browser"
import { useDarwinWindowed } from "@/functions/app"
import { useFetchReactive } from "@/functions/fetch"
import { useHomepageState } from "@/services/main/homepage"
import { useNavigationRecords, installNavMenu, setupItemByNavHistory, setupItemByRef, setupSubItemByNavHistory } from "@/services/base/side-nav-menu"

const router = useActivateTabRoute()

const { histories, forwards, routeBack, routeForward } = router

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

watch(pins, pins => navigationRecords.excludes["FolderDetail"] = pins?.map(i => i.id.toString()) ?? [])

const navigationRecords = useNavigationRecords()

const { menuItems, menuSelected } = installNavMenu({
    router, navigationRecords,
    menuItems: [
        {type: "menu", routeName: "Home", label: "主页", icon: "house"},
        {type: "scope", scopeName: "main", label: "浏览"},
        {type: "menu", routeName: "Illust", label: "图库", icon: "search"},
        {type: "menu", routeName: "Partition", label: "分区", icon: "calendar-alt", submenu: [setupSubItemByNavHistory(navigationRecords, "PartitionDetail")] },
        {type: "menu", routeName: "Book", label: "画集", icon: "clone", submenu: [setupSubItemByNavHistory(navigationRecords, "BookDetail")] },
        {type: "scope", scopeName: "meta", label: "元数据"},
        {type: "menu", routeName: "Author", label: "作者", icon: "user-tag", submenu: [setupSubItemByNavHistory(navigationRecords, "AuthorDetail")] },
        {type: "menu", routeName: "Topic", label: "主题", icon: "hashtag", submenu: [setupSubItemByNavHistory(navigationRecords, "TopicDetail")] },
        {type: "menu", routeName: "Tag", label: "标签", icon: "tag"},
        {type: "menu", routeName: "SourceData", label: "来源数据", icon: "file-invoice"},
        {type: "scope", scopeName: "tool", label: "工具箱"},
        {type: "menu", routeName: "Import", label: "导入", icon: "plus-square", badge: importCountBadge},
        {type: "menu", routeName: "FindSimilar", label: "相似项目", icon: "grin-squint", badge: similarityCountBadge},
        {type: "menu", routeName: "Trash", label: "已删除", icon: "trash-can"},
        {type: "scope", scopeName: "folder", label: "目录"},
        {type: "menu", routeName: "Folder", label: "所有目录", icon: "archive"},
        setupItemByRef(pins, "FolderDetail", "thumbtack", t => ({routePathValue: `${t.id}`, label: t.address.join("/")})),
        setupItemByNavHistory(navigationRecords, "FolderDetail", "folder")
    ]
})

const hasDarwinBorder = useDarwinWindowed()

</script>

<template>
    <SideBar :scrollable="false">
        <template #top-bar>
            <template v-if="histories.length > 0 || forwards.length > 0">
                <Button :class="{'no-app-region': true, 'opacity-50': histories.length <= 0}" square icon="arrow-left" :disabled="histories.length <= 0" @click="routeBack"/>
                <Button :class="{'no-app-region': true, 'opacity-50': forwards.length <= 0}" square icon="arrow-right" :disabled="forwards.length <= 0" @click="routeForward"/>
            </template>
        </template>

        <div id="side-bar" :class="$style['side-bar-area']">
            <div :class="$style['std-menu']"><Menu :items="menuItems" v-model:selected="menuSelected"/></div>
        </div>

        <template #bottom>
            <Flex>
                <Button :class="{[$style['darwin-border-button']]: hasDarwinBorder}" square icon="gear" @click="windowManager.openSetting"/>
                <Button class="ml-1" square icon="circle-question-regular" @click="windowManager.openGuide"/>
                <Button class="ml-1" square icon="note-sticky" @click="windowManager.openNote"/>
                <FlexItem :shrink="0">
                    <div class="ml-auto">
                        <Separator size="large"/>
                        <StagingPostButton/>
                    </div>
                </FlexItem>
            </Flex>
        </template>
    </SideBar>
</template>

<style module lang="sass">
@import "../../styles/base/size"

.side-bar-area
    position: absolute
    left: 0
    top: 0
    width: 100%
    height: 100%
    .std-menu
        height: 100%
        padding: $spacing-1 $spacing-2
        overflow-y: auto
        &:not(:last-child)
            display: none

.darwin-border-button
    border-bottom-left-radius: $radius-size-very-large
</style>
