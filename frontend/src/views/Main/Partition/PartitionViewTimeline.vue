<script setup lang="ts">
import { Block, Icon } from "@/components/universal"
import { usePopupMenu } from "@/modules/popup-menu"
import { useTimelineContext } from "@/services/main/partition"
import { LocalDate } from "@/utils/datetime"

const { months, days, calendarDate, setTimelineRef, setDayRef, setMonthRef, selectMonth, scrollEvent, openPartition, operators } = useTimelineContext()

const menu = usePopupMenu<{date: LocalDate}>(() => [
    {type: "normal", label: "打开", click: i => openPartition(i.date)},
    {type: "normal", label: "在新标签页打开", click: i => openPartition(i.date, "NEW_TAB")},
    {type: "normal", label: "在新窗口打开", click: i => openPartition(i.date, "NEW_WINDOW")},
    {type: "separator"},
    {type: "normal", label: "拷贝所有日期列表", click: operators.copyDateList},
    {type: "normal", label: "添加所有日期作为查询条件", click: operators.addDateListToQueryText},
])

</script>

<template>
    <div :class="$style.timeline">
        <div :ref="setTimelineRef" :class="[$style['left-column'], $style['timeline-list']]" @scroll="scrollEvent">
            <Block v-for="p in days"
                   v-memo="[days, calendarDate?.year === p.date.year && calendarDate.month === p.date.month]"
                   :ref="el => setDayRef(p.date.timestamp, el)"
                   :key="p.date.timestamp"
                   :class="[$style.item, $style[`lv-${p.level}`]]"
                   :color="calendarDate?.year === p.date.year && calendarDate.month === p.date.month ? 'primary' : undefined"
                   @click="openPartition(p.date)"
                   @contextmenu="menu.popup(p)">
                <div :class="$style.processor" :style="`width: ${p.width}%`"/>
                <span :class="$style.content">
                    <Icon class="mr-2" icon="th-list"/>
                    {{p.date.year}}年{{p.date.month}}月{{p.date.day}}日
                </span>
                <div :class="$style['float-right-message']">{{p.count}}项</div>
                <div :class="$style.marked" :style="`width: ${p.width}%`"/>
                <div :class="$style.unmarked" :style="`width: ${100 - p.width}%`"/>
            </Block>
        </div>
        <div :class="[$style['right-column'], $style['timeline-list']]">
            <Block v-for="p in months" v-memo="[months, calendarDate?.year === p.year && calendarDate.month === p.month]" :ref="el => setMonthRef(p.uniqueKey, el)" :key="p.uniqueKey" :class="[$style.item, $style[`lv-${p.level}`]]" :color="calendarDate?.year === p.year && calendarDate.month === p.month ? 'primary' : undefined" @click="selectMonth(p)">
                <div :class="$style.processor" :style="`width: ${p.width}%`"/>
                <span :class="$style.content">
                    <Icon class="mr-2" icon="th-list"/>
                    {{p.year}}年{{p.month}}月
                </span>
                <div :class="$style['float-right-message']">{{p.count}}项 / {{p.dayCount}}天</div>
                <div :class="$style.marked" :style="`width: ${p.width}%`"/>
                <div :class="$style.unmarked" :style="`width: ${100 - p.width}%`"/>
            </Block>
        </div>
    </div>
</template>

<style module lang="sass">
@use "sass:color" as sass-color
@use "@/styles/base/color"
@use "@/styles/base/size"

.timeline
    display: flex
    flex-wrap: nowrap
    width: 100%
    height: 100%
    > .left-column
        width: 60%
        height: 100%
    > .right-column
        width: 40%
        height: 100%

.timeline-list
    padding: 1rem
    box-sizing: border-box
    overflow-y: auto
    .item
        position: relative
        padding: 0.5rem 0.75rem
        margin-bottom: 0.3rem
        cursor: pointer
        overflow: hidden
        &:hover
            transform: translateX(1px)
        > .content
            position: relative
        > .float-right-message
            position: absolute
            right: 0.75rem
            top: 0
            height: 100%
            padding: 0.5rem 0
        > .processor
            position: absolute
            left: 0
            top: 0
            bottom: 0

        @media (prefers-color-scheme: light)
            background: white
            > .content
                mix-blend-mode: difference
                color: color.$light-mode-text-inverted-color
            > .float-right-message
                mix-blend-mode: difference
                color: color.$light-mode-text-inverted-color
            > .processor
                background: black
            > .marked, > .unmarked
                position: absolute
                top: 0
                bottom: 0
                mix-blend-mode: screen
            @for $i from 1 through 10
                &.lv-#{$i} > .marked
                    background-color: sass-color.mix(color.$light-mode-primary, color.$light-mode-block-color, $i * 6% + 40%)
            > .marked
                left: 0
            > .unmarked
                right: 0
                background: color.$light-mode-text-color

        @media (prefers-color-scheme: dark)
            > .content
                color: color.$dark-mode-text-color
            > .float-right-message
                color: color.$dark-mode-text-color
            @for $i from 1 through 10
                &.lv-#{$i} > .processor
                    background-color: sass-color.mix(color.$dark-mode-primary, color.$dark-mode-block-color, $i * 6% + 40%)
            > .marked, > .unmarked
                visibility: hidden
</style>
