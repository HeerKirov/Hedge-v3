<script setup lang="ts">
import { useRouter } from "vue-router"
import { Menu } from "@/components/interaction"
import { Container, SideLayout, SideBar, TopBarLayout, installSideLayoutState } from "@/components/layout"
import { installNavMenu } from "@/services/base/side-nav-menu"

installSideLayoutState()

const { menuItems, menuSelected } = installNavMenu({
    router: useRouter(),
    menuItems: [
        {type: "scope", scopeName: "app", label: "应用程序"},
        {type: "menu", routeName: "SettingAppGeneral", label: "通用", icon: "cloud-sun"},
        {type: "menu", routeName: "SettingAppStorage", label: "存储", icon: "briefcase"},
        {type: "scope", scopeName: "db", label: "功能"},
        {type: "menu", routeName: "SettingDBMeta", label: "元数据", icon: "coffee"},
        {type: "menu", routeName: "SettingDBQuery", label: "查询", icon: "search"},
        {type: "menu", routeName: "SettingDBImport", label: "导入", icon: "plus-square"},
        {type: "menu", routeName: "SettingDBFindSimilar", label: "相似项查找", icon: "grin-squint"},
        {type: "scope", scopeName: "dim", label: "数据库"},
        {type: "menu", routeName: "SettingDimAnnotation", label: "注解", icon: "code"},
        {type: "menu", routeName: "SettingDimSource", label: "来源站点", icon: "file-invoice"},
        {type: "scope", scopeName: "advanced", label: "高级选项"},
        {type: "menu", routeName: "SettingAdvancedServer", label: "核心服务", icon: "server"},
        {type: "menu", routeName: "SettingAdvancedChannel", label: "频道", icon: "coins"},
    ]
})

</script>

<template>
    <SideLayout class="is-full-view">
        <template #default>
            <TopBarLayout>
                <Container class="pt-4">
                    <RouterView/>
                </Container>
            </TopBarLayout>
        </template>
        <template #side>
            <SideBar>
                <Menu :items="menuItems" v-model:selected="menuSelected"/>
            </SideBar>
        </template>
    </SideLayout>
</template>

<style module lang="sass">

</style>
