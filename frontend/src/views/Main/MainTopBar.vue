<script setup lang="ts">
import { Block, Button, Separator } from "@/components/universal"
import { Tab, useBrowserTabs } from "@/modules/browser"
import { useDynamicPopupMenu } from "@/modules/popup-menu"

const { tabs, newTab, activeTab, moveTab, closeTab, duplicateTab } = useBrowserTabs()

const menu = useDynamicPopupMenu<Tab>(tab => [
    {type: "normal", label: "将标签页前移", enabled: tab.index > 0, click: tab => moveTab({index: tab.index, toIndex: tab.index - 1})},
    {type: "normal", label: "将标签页后移", enabled: tab.index < tabs.value.length - 1, click: tab => moveTab({index: tab.index, toIndex: tab.index + 1})},
    {type: "separator"},
    {type: "normal", label: "复制标签页", click: tab => duplicateTab({index: tab.index})},
    {type: "separator"},
    {type: "normal", label: "关闭标签页", click: tab => closeTab({index: tab.index})}
])

const mouseUp = (e: MouseEvent, tab: Tab) => {
    if(e.button === 1) {
        closeTab({index: tab.index})
    }
}

</script>

<template>
    <div :class="$style['tab-bar']">
        <template v-for="tab in tabs" :key="tab.id">
            <Block :class="[{[$style.active]: tab.active}, $style.tab, 'no-app-region']" @click="activeTab(tab.index)" @mouseup="mouseUp($event, tab)" @contextmenu="menu.popup(tab)">
                <span class="no-wrap overflow-ellipsis">{{ tab.title ?? "无标题" }}</span>
                <Button v-if="tab.active" :class="$style.close" size="tiny" square icon="close" @click.stop="closeTab({index: tab.index})"/>
            </Block>
            <Separator/>
        </template>
        <Button :class="[$style['new-tab-button'], 'no-app-region']" size="small" square icon="plus" @click="newTab()"/>
        <div id="top-bar" :class="$style['extra-area']"/>
    </div>
</template>

<style module lang="sass">
@import "../../styles/base/size"
@import "../../styles/base/color"

.tab-bar
    display: flex
    flex-wrap: nowrap
    height: 100%

    > .tab
        flex: 0 1 auto
        display: flex
        flex-wrap: nowrap
        align-items: center
        justify-content: space-between
        padding: 0 5px 0 $spacing-2
        border-radius: $radius-size-large
        width: 180px
        font-weight: 700

        &.active
            background-color: $light-mode-background-color
            @media (prefers-color-scheme: dark)
                background-color: $dark-mode-background-color

        &:not(.active)
            font-weight: 500
            color: $light-mode-secondary-text-color
            border: solid 1px $light-mode-block-color
            @media (prefers-color-scheme: dark)
                color: $dark-mode-secondary-text-color
                border-color: $dark-mode-block-color

            &:hover
                background-color: $light-mode-background-color
                @media (prefers-color-scheme: dark)
                    background-color: $dark-mode-background-color

        > .close
            font-size: $font-size-small
            flex: 0 0 auto

    > .new-tab-button
        flex: 0 0 auto
        align-self: center

    > .extra-area
        flex: 1 0 auto
        display: flex
        flex-wrap: nowrap
        justify-content: flex-end
        > *
            -webkit-app-region: none
</style>