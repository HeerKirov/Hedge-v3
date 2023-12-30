<script setup lang="ts">
import { computed, } from "vue"
import { TopBarLayout, SideLayout } from "@/components/layout"
import { useViewStack } from "@/components-module/view-stack"
import { useBrowserTabStacks } from "@/modules/browser"
import { installNavHistory } from "@/services/base/side-nav-menu"
import MainSideBar from "./MainSideBar.vue"
import MainTopBar from "./MainTopBar.vue"
import MainTab from "./MainTab.vue"

const { tabStacks, activeIndex } = useBrowserTabStacks()

const viewStack = useViewStack()

const stackExists = computed(() => viewStack.size() > 0)

installNavHistory()

</script>

<template>
    <SideLayout :class="{'is-full-view': true, [$style.hidden]: stackExists}">
        <template #default>
            <TopBarLayout>
                <template #top-bar>
                    <MainTopBar/>
                </template>

                <MainTab v-for="(view, index) in tabStacks" :key="view.id" :view="view" :active="activeIndex === index" :index="index"/>
            </TopBarLayout>
        </template>

        <template #side>
            <MainSideBar/>
        </template>
    </SideLayout>
</template>

<style module lang="sass">
.hidden
    visibility: hidden
    transition: visibility 0.15s
</style>
