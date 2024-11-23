<script setup lang="ts">
import { Menu, MenuItem, MenuScope } from "@/components/interaction"
import { SideLayout, TopBarLayout, Container, SideBar, MiddleLayout, installSideLayoutState } from "@/components/layout"
import { useMarkdownDocument } from "@/services/base/side-nav-md"

installSideLayoutState()

const { menuSelected, component, title, menuItems } = useMarkdownDocument({
    routeName: "Guide",
    documentDir: "./markdown",
    default: "quickstart",
    documents: [
        {scopeName: "introduction", label: "简介", documents: [
            {id: "quickstart", title: "入门", icon: "flag", component: () => import("./markdown/quickstart.md")},
        ]},
        {scopeName: "illust", label: "构建图库", documents: [
            {id: "illust", title: "图像", icon: "image", component: () => import("./markdown/illust.md")},
            {id: "relation", title: "组织结构", icon: "clone", component: () => import("./markdown/relation.md")},
            {id: "meta-tag", title: "元数据标签", icon: "user-tag", component: () => import("./markdown/meta-tag.md")},
            {id: "source", title: "来源数据", icon: "file-invoice", component: () => import("./markdown/source.md")},
        ]},
        {scopeName: "tools", label: "工具箱", documents: [
            {id: "import", title: "导入", icon: "plus-square", component: () => import("./markdown/import.md")},
            {id: "find-similar", title: "相似项查找", icon: "grin-squint", component: () => import("./markdown/find-similar.md")},
        ]},
        {scopeName: "query", label: "HQL高级查询", documents: [
            {id: "query", title: "高级查询入门", icon: "search", component: () => import("./markdown/query.md")},
            {id: "query-dialect", title: "查询关键字", icon: "keyboard", component: () => import("./markdown/query-dialect.md")},
            {id: "query-grammar", title: "完整语法", icon: "landmark-flag", component: () => import("./markdown/query-grammar.md")},
        ]},
    ]
})

</script>

<template>
    <SideLayout class="is-full-view">
        <template #default>
            <TopBarLayout>
                <template #top-bar>
                    <MiddleLayout class="is-font-size-large">
                        {{ title }}
                    </MiddleLayout>
                </template>
                <Container v-if="component !== null" :key="component.__name" class="pt-4">
                    <component :is="component" :class="$style.markdown"/>
                </Container>
            </TopBarLayout>
        </template>
        <template #side>
            <SideBar>
                <Menu v-model:selected="menuSelected">
                    <MenuScope v-for="scope in menuItems" :key="scope.scopeName" :id="scope.scopeName" :label="scope.label">
                        <MenuItem v-for="document in scope.documents" :key="document.id" :id="document.id" :label="document.title" :icon="document.icon"/>
                    </MenuScope>
                </Menu>
            </SideBar>
        </template>
    </SideLayout>
</template>

<style module lang="sass">
@use "sass:color" as sass-color
@use "@/styles/base/size"
@use "@/styles/base/color"

.markdown
    -webkit-user-select: text
    h1,h2,h3,h4,h5,p,ul,ol
        padding: size.$spacing-1 0
    li
        padding: size.$spacing-half 0
        margin-left: size.$spacing-5
    a
        margin: 0 size.$spacing-half
        border-bottom: solid 1px
    h1,h2
        margin: size.$spacing-2 0
        border-bottom: solid 2px
        border-color: color.$light-mode-border-color
        @media (prefers-color-scheme: dark)
            border-color: color.$dark-mode-border-color
    h3
        margin: size.$spacing-2 0
    pre
        margin: size.$spacing-1 0
        padding: size.$spacing-1
        border-radius: size.$radius-size-std
        background-color: sass-color.mix(color.$light-mode-background-color, color.$light-mode-secondary, 90%)
        @media (prefers-color-scheme: dark)
            background-color: sass-color.mix(color.$dark-mode-background-color, color.$dark-mode-secondary, 90%)
        > code
            padding: 0
    blockquote
        padding: size.$spacing-half size.$spacing-1
        border-radius: size.$radius-size-std
        background-color: color.$light-mode-border-color
        @media (prefers-color-scheme: dark)
            background-color: color.$dark-mode-border-color
</style>