<script setup lang="ts">
import { computed, watch } from "vue"
import { useRouter } from "vue-router"
import { SideLayout, SideBar, Flex, FlexItem } from "@/components/layout"
import { Button, Separator } from "@/components/universal"
import { Menu } from "@/components/interaction"
import { StagingPostButton } from "@/components-module/common"
import { useViewStack } from "@/components-module/view-stack"
import { useFetchReactive } from "@/functions/fetch"
import { installNavMenu, installNavHistory, setupItemByNavHistory, setupItemByRef, setupSubItemByNavHistory } from "@/services/base/side-nav-menu"
import { useHomepageState } from "@/services/main/homepage"
import { windowManager } from "@/modules/window"

const viewStack = useViewStack()

const stackExists = computed(() => viewStack.size() > 0)

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
        return [{count: homepageState.value.importImageErrorCount, type: "danger" as const}, {count: homepageState.value.importImageCount, type: "std" as const}]
    }
})

const { data: pins } = useFetchReactive({
    get: client => client.folder.pin.list,
    eventFilter: "entity/folder/pin/changed"
})

const navHistory = installNavHistory()

watch(pins, pins => navHistory.excludes["MainFolder"] = pins?.map(i => i.id.toString()) ?? [])

const { menuItems, menuSelected } = installNavMenu({
    router: useRouter(),
    menuItems: [
        {type: "menu", routeName: "MainHome", label: "主页", icon: "house"},
        {type: "scope", scopeName: "main", label: "浏览"},
        {type: "menu", routeName: "MainIllust", label: "图库", icon: "search"},
        {type: "menu", routeName: "MainPartition", label: "分区", icon: "calendar-alt", submenu: [setupSubItemByNavHistory(navHistory, "MainPartition", "detail")] },
        {type: "menu", routeName: "MainBook", label: "画集", icon: "clone"},
        {type: "scope", scopeName: "meta", label: "元数据"},
        {type: "menu", routeName: "MainAuthor", label: "作者", icon: "user-tag", submenu: [setupSubItemByNavHistory(navHistory, "MainAuthor", "detail")] },
        {type: "menu", routeName: "MainTopic", label: "主题", icon: "hashtag", submenu: [setupSubItemByNavHistory(navHistory, "MainTopic", "detail")] },
        {type: "menu", routeName: "MainTag", label: "标签", icon: "tag"},
        {type: "menu", routeName: "MainAnnotation", label: "注解", icon: "code"},
        {type: "menu", routeName: "MainSourceData", label: "来源数据", icon: "file-invoice"},
        {type: "scope", scopeName: "tool", label: "工具箱"},
        {type: "menu", routeName: "MainImport", label: "导入", icon: "plus-square", badge: importCountBadge},
        {type: "menu", routeName: "MainFindSimilar", label: "相似项目", icon: "grin-squint", badge: similarityCountBadge},
        {type: "menu", routeName: "MainTrash", label: "已删除", icon: "trash-can"},
        {type: "scope", scopeName: "folder", label: "目录"},
        {type: "menu", routeName: "MainFolder", label: "所有目录", icon: "archive"},
        setupItemByRef(pins, "MainFolder", "detail", "thumbtack", t => ({routeQueryValue: `${t.id}`, label: t.address.join("/")})),
        setupItemByNavHistory(navHistory, "MainFolder", "detail", "folder")
    ]
})

</script>

<template>
    <SideLayout :class="{'is-full-view': true, [$style.hidden]: stackExists}">
        <RouterView/>

        <template #side>
            <SideBar>
                <Menu :items="menuItems" v-model:selected="menuSelected"/>

                <template #bottom>
                    <Flex>
                        <Button square icon="gear" @click="windowManager.openSetting"/>
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
    </SideLayout>
</template>

<style module lang="sass">
.hidden
    visibility: hidden
    transition: visibility 0.15s
</style>
