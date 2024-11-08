<script setup lang="ts">
import { Block } from "@/components/universal"
import { useCalendarContext } from "@/services/main/partition"
import { usePopupMenu } from "@/modules/popup-menu"
import CalendarRouter from "./CalendarRouter.vue"

const { items, calendarDate, openPartition } = useCalendarContext()

const WEEKDAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const

const menu = usePopupMenu<{day: number, count: number | null}>(() => [
    {type: "normal", label: "打开", click: i => openPartition(i)},
    {type: "normal", label: "在新标签页打开", click: i => openPartition(i, "NEW_TAB")},
    {type: "normal", label: "在新窗口打开", click: i => openPartition(i, "NEW_WINDOW")},
])

</script>

<template>
    <div :class="$style.root">
        <div :class="$style.router"><CalendarRouter v-if="calendarDate !== null" v-model:value="calendarDate"/></div>
        <Block :class="$style.header">
            <b v-for="i in WEEKDAY_NAMES" :class="$style.col">{{i}}</b>
        </Block>
        <div :class="$style.body">
            <div v-for="item in items" :class="$style.col">
                <Block v-if="item !== null" :class="{[$style.hoverable]: !!item.level, [$style[`lv-${item.level}`]]: !!item.level}" @click="openPartition(item)" @contextmenu="menu.popup(item)">
                    <b :class="{'has-text-underline': item.today}">{{item.day}}</b>
                    <p v-if="item.count" :class="$style.count">{{item.count}}项</p>
                </Block>
            </div>
        </div>
    </div>
</template>

<style module lang="sass">
@use "sass:math"
@use "sass:color" as sass-color
@use "@/styles/base/color"

$column-num: 7

.root
    overflow-y: auto
    height: 100%

.router
    display: flex
    justify-content: center
    width: 100%
    margin: 0.5rem 0

.header
    display: flex
    padding: 0
    margin: 1rem
    > .col
        box-sizing: border-box
        width: #{math.percentage(calc(1 / $column-num))}
        text-align: center
        padding-top: 1.5rem
        padding-bottom: 1.5rem

.body
    display: flex
    flex-wrap: wrap
    margin: 0.5rem
    > .col
        box-sizing: border-box
        width: #{math.percentage(calc(1 / $column-num))}
        padding: 0.5rem

        > div
            position: relative
            padding: 0.75rem
            height: 3.5rem
            &.hoverable
                cursor: pointer
            &.hoverable:hover
                transform: translateY(-1px)
            > .count
                position: absolute
                right: 0.75rem
                bottom: 0.5rem
            @for $i from 1 through 10
                &.lv-#{$i}
                    @media (prefers-color-scheme: light)
                        background-color: sass-color.mix(color.$light-mode-primary, color.$light-mode-block-color, $i * 9% + 10%)
                        color: if($i > 5, color.$light-mode-text-inverted-color, color.$light-mode-text-color)
                    @media (prefers-color-scheme: dark)
                        background-color: sass-color.mix(color.$dark-mode-primary, color.$dark-mode-block-color, $i * 9% + 10%)
                        color: color.$dark-mode-text-color
</style>
