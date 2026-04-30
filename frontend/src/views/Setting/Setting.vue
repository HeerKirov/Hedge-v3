<script setup lang="ts">
import { MenuScope, NavMenuItem, RouterNavMenu } from "@/components/interaction"
import { Container, SideLayout, SideBar, TopBarLayout } from "@/components/layout"


</script>

<template>
    <SideLayout class="is-full-view">
        <template #default>
            <TopBarLayout>
                <template #top-bar>
                    <div id="top-bar" :class="[{[$style['darwin-border-area']]: false}, $style['top-bar']]"/>
                </template>
                <Container class="pt-4">
                    <RouterView/>
                </Container>
            </TopBarLayout>
        </template>
        <template #side>
            <SideBar>
                <RouterNavMenu>
                    <MenuScope id="app" label="应用程序">
                        <NavMenuItem route-name="SettingAppGeneral" label="通用" icon="cloud-sun"/>
                        <NavMenuItem route-name="SettingAppStorage" label="存储" icon="briefcase"/>
                    </MenuScope>
                    <MenuScope id="db" label="功能">
                        <NavMenuItem route-name="SettingDBMeta" label="元数据" icon="coffee"/>
                        <NavMenuItem route-name="SettingDBQuery" label="查询" icon="search"/>
                        <NavMenuItem route-name="SettingDBImport" label="导入" icon="plus-square"/>
                        <NavMenuItem route-name="SettingDBFindSimilar" label="相似项查找" icon="grin-squint"/>
                    </MenuScope>
                    <MenuScope id="dim" label="数据库">
                        <NavMenuItem route-name="SettingDimSource" label="来源站点" icon="file-invoice"/>
                    </MenuScope>
                    <MenuScope id="advanced" label="高级选项">
                        <NavMenuItem route-name="SettingAdvancedServer" label="核心服务" icon="server"/>
                        <NavMenuItem route-name="SettingAdvancedChannel" label="频道" icon="coins"/>
                    </MenuScope>
                </RouterNavMenu>
            </SideBar>
        </template>
    </SideLayout>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.top-bar
    position: relative
    display: flex
    flex-wrap: nowrap
    height: 100%
    > *
        -webkit-app-region: none
    &.darwin-border-area > button:last-child
            border-top-right-radius: size.$radius-size-darwin
</style>