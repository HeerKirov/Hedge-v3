<script setup lang="ts">
import { ref } from "vue"
import { SideLayout, SideBar, TopBar } from "@/components/layout"
import { Button } from "@/components/universal"
import { Menu } from "@/components/interaction"
import { useFetchReactive } from "@/functions/fetch"
import { installNavMenu, installNavHistory, setupItemByNavHistory, setupItemByRef, setupSubItemByNavHistory } from "@/services/app/side-nav-menu"
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
        {type: "menu", routeName: "MainIllusts", label: "图库", icon: "house"},
        {type: "menu", routeName: "MainPartitions", label: "分区", icon: "house", submenu: [setupSubItemByNavHistory(navHistory, "MainPartitions", "detail")] },
        {type: "menu", routeName: "MainBooks", label: "画集", icon: "house"},
        {type: "scope", scopeName: "meta", label: "元数据"},
        {type: "menu", routeName: "MainTags", label: "标签", icon: "house"},
        {type: "scope", scopeName: "folder", label: "目录"},
        {type: "menu", routeName: "MainFolders", label: "所有目录", icon: "house"},
        setupItemByRef(pins, "MainFolders", "detail", "star", t => ({routeQueryValue: `${t.id}`, label: t.address.join("/")})),
        setupItemByNavHistory(navHistory, "MainFolders", "detail", "file")
        //TODO 还需要一个特化机制，在pin和history之间只能二选一存在
    ]
})

</script>

<template>
    <SideLayout :class="{'full-view': true, 'is-hidden': stackExists}">
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
