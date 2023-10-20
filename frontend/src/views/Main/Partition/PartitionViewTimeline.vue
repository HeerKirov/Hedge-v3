<script setup lang="ts">
import { Block, Icon } from "@/components/universal"
import { useTimelineContext } from "@/services/main/partition"

const { months, days, calendarDate, setTimelineRef, setDayRef, setMonthRef, selectMonth, scrollEvent, openPartition } = useTimelineContext()

</script>

<template>
    <div :class="$style.timeline">
        <div :ref="setTimelineRef" :class="[$style['left-column'], $style['timeline-list']]" @scroll="scrollEvent">
            <Block v-for="p in days" v-memo="[days, calendarDate?.year === p.date.year && calendarDate.month === p.date.month]" :ref="el => setDayRef(p.date.timestamp, el)" :key="p.date.timestamp" :class="[$style.item, $style[`lv-${p.level}`]]" :color="calendarDate?.year === p.date.year && calendarDate.month === p.date.month ? 'primary' : undefined" @click="openPartition(p.date)">
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
@import "../../../styles/base/color"
@import "../../../styles/base/size"

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
                color: $light-mode-text-inverted-color
            > .float-right-message
                mix-blend-mode: difference
                color: $light-mode-text-inverted-color
            > .processor
                background: black
            > .marked, > .unmarked
                position: absolute
                left: 0
                top: 0
                bottom: 0
                mix-blend-mode: screen
            @for $i from 1 through 10
                &.lv-#{$i} > .marked
                    background-color: mix($light-mode-primary, $light-mode-block-color, $i * 6% + 40%)
            > .unmarked
                background: $light-mode-text-color

        @media (prefers-color-scheme: dark)
            > .content
                color: $dark-mode-text-color
            > .float-right-message
                color: $dark-mode-text-color
            @for $i from 1 through 10
                &.lv-#{$i} > .processor
                    background-color: mix($dark-mode-primary, $dark-mode-block-color, $i * 6% + 40%)
            > .marked, > .unmarked
                visibility: hidden
</style>
