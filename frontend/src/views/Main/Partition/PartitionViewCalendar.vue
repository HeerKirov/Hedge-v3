<script setup lang="ts">
import { Block } from "@/components/universal"
import { useCalendarContext } from "@/services/main/partition"
import CalendarRouter from "./CalendarRouter.vue"

const { items, calendarDate, openPartition } = useCalendarContext()

const WEEKDAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]

</script>

<template>
    <div :class="$style.router"><CalendarRouter v-model:value="calendarDate"/></div>
    <Block :class="$style.header">
        <div v-for="i in WEEKDAY_NAMES" :class="$style.col">{{i}}</div>
    </Block>
    <div :class="$style.body">
        <div v-for="item in items" :class="$style.col">
            <Block v-if="item !== null" :class="{[$style.hoverable]: !!item.count}" :color="item.count ? 'primary' : undefined" @click="openPartition(item)">
                <b :class="{'has-text-underline': item.today}">{{item.day}}</b>
                <p v-if="item.count" :class="$style.count">{{item.count}}项</p>
            </Block>
        </div>
    </div>
</template>

<style module lang="sass">
$column-num: 7

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
        width: #{percentage(1 / $column-num)}
        text-align: center
        padding-top: 1.5rem
        padding-bottom: 1.5rem

.body
    display: flex
    flex-wrap: wrap
    margin: 0.5rem
    > .col
        box-sizing: border-box
        width: #{percentage(1 / $column-num)}
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
</style>
