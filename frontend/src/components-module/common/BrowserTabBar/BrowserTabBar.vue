<script setup lang="ts">
import { ElementPopupMenu } from "@/components/interaction"
import { Button, Separator } from "@/components/universal"
import { MenuItem, useDynamicPopupMenu } from "@/modules/popup-menu"
import { Tab, useBrowserTabs, useClosedTabs } from "@/modules/browser"
import { installDraggingContext } from "./context"
import TabButton from "./TabButton.vue"

const { tabs, newTab, activeTab, moveTab, closeTab, duplicateTab } = useBrowserTabs()

const { tabs: closedTabs, resume } = useClosedTabs()

const menu = useDynamicPopupMenu<Tab>(tab => [
    {type: "normal", label: "将标签页前移", enabled: tab.index > 0, click: tab => moveTab({index: tab.index, toIndex: tab.index - 1})},
    {type: "normal", label: "将标签页后移", enabled: tab.index < tabs.value.length - 1, click: tab => moveTab({index: tab.index, toIndex: tab.index + 1})},
    {type: "separator"},
    {type: "normal", label: "复制标签页", click: tab => duplicateTab({index: tab.index})},
    {type: "separator"},
    {type: "normal", label: "关闭标签页", click: tab => closeTab({index: tab.index})}
])

const closedTabMenu = () => <MenuItem<undefined>[]>[
    {type: "normal", label: "重新打开关闭的标签页", enabled: false},
    {type: "separator"},
    ...closedTabs().map((item, index) => ({type: "normal", label: item, click: () => resume(index) }))
]

installDraggingContext({activeTab, moveTab})

</script>

<template>
    <transition-group :enter-from-class="$style['transition-enter-from']"
                      :leave-to-class="$style['transition-leave-to']"
                      :enter-active-class="$style['transition-enter-active']"
                      :leave-active-class="$style['transition-leave-active']"
                      :move-class="$style['transition-list-move']">
        <template v-for="tab in tabs" :key="tab.id">
            <TabButton :tab @active="activeTab" @close="closeTab" @contextmenu="menu.popup"/>
            <Separator/>
        </template>
    </transition-group>
    <ElementPopupMenu :items="closedTabMenu" position="bottom" v-slot="{ popup, setEl }">
        <Button :ref="setEl" :class="[$style['new-tab-button'], 'no-app-region']" size="small" square icon="plus" @click="newTab()" @contextmenu="popup"/>
    </ElementPopupMenu>
</template>

<style module lang="sass">
.new-tab-button
    flex: 0 0 auto
    align-self: center

.transition-enter-from
    transform: translateY(-30px)

.transition-enter-from,
.transition-leave-to
    opacity: 0

.transition-enter-active,
.transition-leave-active,
.transition-list-move
    transition: all 0.3s ease

.transition-leave-active
    position: absolute
</style>