<script setup lang="ts">
import { computed } from "vue"
import { SideLayout, SideBar } from "@/components/layout"
import { Button } from "@/components/universal"
import { Menu } from "@/components/interaction"
import { useViewStack } from "@/components-module/view-stack"
import { useFetchReactive } from "@/functions/fetch"
import { installNavMenu, installNavHistory, setupItemByNavHistory, setupItemByRef, setupSubItemByNavHistory } from "@/services/base/side-nav-menu"
import { windowManager } from "@/modules/window"

const viewStack = useViewStack()

const stackExists = computed(() => viewStack.size() > 0)

const navHistory = installNavHistory()

const { data: pins } = useFetchReactive({
    get: client => client.folder.pin.list,
    eventFilter: "entity/folder-pin/changed"
})

const { menuItems, menuSelected } = installNavMenu({
    menuItems: [
        {type: "menu", routeName: "MainHome", label: "主页", icon: "house"},
        {type: "scope", scopeName: "main", label: "浏览"},
        {type: "menu", routeName: "MainIllust", label: "图库", icon: "search"},
        {type: "menu", routeName: "MainPartition", label: "分区", icon: "calendar-alt", submenu: [setupSubItemByNavHistory(navHistory, "MainPartitions", "detail")] },
        {type: "menu", routeName: "MainBook", label: "画集", icon: "clone"},
        {type: "scope", scopeName: "meta", label: "元数据"},
        {type: "menu", routeName: "MainAuthor", label: "作者", icon: "user-tag"},
        {type: "menu", routeName: "MainTopic", label: "主题", icon: "hashtag"},
        {type: "menu", routeName: "MainTag", label: "标签", icon: "tag"},
        {type: "menu", routeName: "MainAnnotation", label: "注解", icon: "code"},
        {type: "scope", scopeName: "tool", label: "工具箱"},
        {type: "menu", routeName: "MainImport", label: "导入", icon: "plus-square"},
        {type: "menu", routeName: "MainSourceData", label: "来源数据", icon: "file-invoice"},
        {type: "menu", routeName: "MainFindSimilar", label: "相似项查找", icon: "grin-squint"},
        {type: "scope", scopeName: "folder", label: "目录"},
        {type: "menu", routeName: "MainFolder", label: "所有目录", icon: "archive"},
        setupItemByRef(pins, "MainFolders", "detail", "thumbtack", t => ({routeQueryValue: `${t.id}`, label: t.address.join("/")})),
        setupItemByNavHistory(navHistory, "MainFolders", "detail", "folder")
        //TODO 还需要一个特化机制，在pin和history之间只能二选一存在
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
                    <Button square icon="gear" @click="windowManager.openSetting"/>
                    <Button class="ml-1" square icon="circle-question" @click="windowManager.openGuide"/>
                    <Button class="ml-1 float-right" icon="clipboard">10</Button>
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
