<script setup lang="ts">
import { ref } from "vue"
import { SideLayout, SideBar, TopBar } from "@/components/layout"
import { Button } from "@/components/universal"
import { Menu } from "@/components/interaction"
import { useFetchReactive } from "@/functions/fetch"
import { installNavMenu, installNavHistory, setupItemByNavHistory, setupItemByRef, setupSubItemByNavHistory } from "@/services/feature/side-nav-menu"
import { windowManager } from "@/services/module/window"

const stackExists = ref(false)

const navHistory = installNavHistory()

const { data: pins } = useFetchReactive({
    get: client => client.folder.pin.list,
    eventFilter: "entity/folder-pin/changed"
})

const { menuItems, menuSelected } = installNavMenu({
    menuItems: [
        {type: "menu", routeName: "MainHome", label: "主页", icon: "house"},
        {type: "scope", scopeName: "main", label: "浏览"},
        {type: "menu", routeName: "MainIllusts", label: "图库", icon: "search"},
        {type: "menu", routeName: "MainPartitions", label: "分区", icon: "calendar-alt", submenu: [setupSubItemByNavHistory(navHistory, "MainPartitions", "detail")] },
        {type: "menu", routeName: "MainBooks", label: "画集", icon: "clone"},
        {type: "scope", scopeName: "meta", label: "元数据"},
        {type: "menu", routeName: "MainAuthors", label: "作者", icon: "user-tag"},
        {type: "menu", routeName: "MainTopics", label: "主题", icon: "hashtag"},
        {type: "menu", routeName: "MainTags", label: "标签", icon: "tag"},
        {type: "menu", routeName: "MainAnnotations", label: "注解", icon: "code"},
        {type: "scope", scopeName: "tool", label: "工具箱"},
        {type: "menu", routeName: "MainImport", label: "导入", icon: "plus-square"},
        {type: "menu", routeName: "MainSourceData", label: "来源数据", icon: "file-invoice"},
        {type: "menu", routeName: "MainFindSimilar", label: "相似项查找", icon: "grin-squint"},
        {type: "scope", scopeName: "folder", label: "目录"},
        {type: "menu", routeName: "MainFolders", label: "所有目录", icon: "archive"},
        setupItemByRef(pins, "MainFolders", "detail", "thumbtack", t => ({routeQueryValue: `${t.id}`, label: t.address.join("/")})),
        setupItemByNavHistory(navHistory, "MainFolders", "detail", "folder")
        //TODO 还需要一个特化机制，在pin和history之间只能二选一存在
    ]
})

</script>

<template>
    <SideLayout :class="{'is-full-view': true, 'is-hidden': stackExists}">
        <template #default>
            <TopBar>
                <Button square icon="arrow-left"/>
            </TopBar>
            hello
        </template>
        <template #side>
            <SideBar>
                <template #default>
                    <Menu :items="menuItems" v-model:selected="menuSelected"/>
                </template>
                <template #bottom>
                    <Button square icon="gear" @click="windowManager.openSetting"/>
                    <Button class="ml-1" square icon="circle-question" @click="windowManager.openGuide"/>
                    <Button class="ml-1 float-right" icon="clipboard">10</Button>
                </template>
            </SideBar>
        </template>
    </SideLayout>
</template>
