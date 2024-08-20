<script setup lang="ts">
import { computed, } from "vue"
import { TopBarLayout, SideLayout } from "@/components/layout"
import { useStackedView } from "@/components-module/stackedview"
import { useBrowserTabStacks } from "@/modules/browser"
import { installNavigationRecords } from "@/services/base/side-nav-menu"
import MainSideBar from "./MainSideBar.vue"
import MainTopBar from "./MainTopBar.vue"
import MainTab from "./MainTab.vue"

const { tabStacks, activeIndex } = useBrowserTabStacks()

const stackedView = useStackedView()

const stackExists = computed(() => stackedView.current.value !== null)

installNavigationRecords()

</script>

<template>
    <SideLayout :class="{'is-full-view': true, [$style.hidden]: stackExists}">
        <TopBarLayout>
            <template #top-bar>
                <MainTopBar/>
            </template>

            <MainTab v-for="(view, index) in tabStacks" :key="view.id" :view="view" :active="activeIndex === index"/>
        </TopBarLayout>

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
