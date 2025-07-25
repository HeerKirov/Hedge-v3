<script setup lang="ts">
import { Button, Separator } from "@/components/universal"
import { useDynamicPopupMenu } from "@/modules/popup-menu"
import { Tab, useBrowserTabs } from "@/modules/browser"
import { installDraggingContext } from "./context"
import TabButton from "./TabButton.vue"

const { tabs, newTab, activeTab, moveTab, closeTab, duplicateTab } = useBrowserTabs()

const menu = useDynamicPopupMenu<Tab>(tab => [
    {type: "normal", label: "将标签页前移", enabled: tab.index > 0, click: tab => moveTab({index: tab.index, toIndex: tab.index - 1})},
    {type: "normal", label: "将标签页后移", enabled: tab.index < tabs.value.length - 1, click: tab => moveTab({index: tab.index, toIndex: tab.index + 1})},
    {type: "separator"},
    {type: "normal", label: "复制标签页", click: tab => duplicateTab({index: tab.index})},
    {type: "separator"},
    {type: "normal", label: "关闭标签页", click: tab => closeTab({index: tab.index})}
])

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
    <Button :class="[$style['new-tab-button'], 'no-app-region']" size="small" square icon="plus" @click="newTab()"/>
</template>

<style module lang="sass">
.new-tab-button
    flex: 0 0 auto
    align-self: center

.transition-enter-from,
.transition-leave-to
    opacity: 0
    transform: translateY(-30px)

.transition-enter-active,
.transition-leave-active,
.transition-list-move
    transition: all 0.3s ease

.transition-leave-active
    position: absolute
</style>