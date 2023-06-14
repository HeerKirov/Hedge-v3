<script setup lang="ts">
import { Block, Icon } from "@/components/universal"
import { useTimelineContext } from "@/services/main/partition"

const { partitionMonthData, partitionData, calendarDate, setPmRef, setMonthRef, selectMonth, scrollEvent, openPartition } = useTimelineContext()

</script>

<template>
    <div :class="$style.timeline">
        <div :class="[$style['left-column'], $style['timeline-list']]" @scroll="scrollEvent">
            <div v-for="pm in partitionData" :key="`${pm.year}-${pm.month}`" :ref="el => setPmRef(`${pm.year}-${pm.month}`, el)">
                <Block v-for="p in pm.items" :key="p.day" :class="$style.item" color="primary" @click="openPartition(pm.year, pm.month, p.day)">
                    <Icon class="mr-2" icon="th-list"/>{{pm.year}}年{{pm.month}}月{{p.day}}日
                    <div :class="$style['float-right-message']">{{p.count}}项</div>
                </Block>
            </div>
        </div>
        <div :class="[$style['right-column'], $style['timeline-list']]">
            <div v-for="p in partitionMonthData" :key="`${p.year}-${p.month}`" :ref="el => setMonthRef(`${p.year}-${p.month}`, el)" >
                <Block :class="$style.item" :color="calendarDate.year === p.year && calendarDate.month === p.month ? 'primary' : undefined" @click="selectMonth(p.year, p.month)">
                    <Icon class="mr-2" icon="th-list"/>{{p.year}}年{{p.month}}月
                    <div :class="$style['float-right-message']">共{{p.count}}项 / 共{{p.dayCount}}天</div>
                </Block>
            </div>
        </div>
    </div>
</template>

<style module lang="sass">
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
        &:hover
            transform: translateX(1px)
        > .float-right-message
            position: absolute
            right: 0.75rem
            top: 0
            height: 100%
            padding: 0.5rem 0
</style>
