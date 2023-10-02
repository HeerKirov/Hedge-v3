<script setup lang="ts">
import { computed } from "vue"
import { NumberInput } from "@/components/form"
import { datetime, getDaysOfMonth, LocalDateTime } from "@/utils/datetime"
import { KeyEvent } from "@/modules/keyboard"

const props = defineProps<{
    value: LocalDateTime
    autoFocus?: boolean
}>()

const emit = defineEmits<{
    (e: "update:value", value: LocalDateTime): void
    (e: "enter"): void
}>()

const maxDay = computed(() => props.value ? getDaysOfMonth(props.value.year, props.value.month) : undefined)

const setYear = (year: number) => emit("update:value", datetime.withYear(props.value, year))
const setMonth = (month: number) => emit("update:value", datetime.withMonth(props.value, month))
const setDay = (day: number) => emit("update:value", datetime.withDay(props.value, day))
const setHour = (hour: number) => emit("update:value", datetime.withHour(props.value, hour))
const setMinute = (minute: number) => emit("update:value", datetime.withMinute(props.value, minute))
const setSecond = (second: number) => emit("update:value", datetime.withSecond(props.value, second))

const enterOnYear = (e: KeyEvent) => {
    setYear(parseInt((e.target as HTMLInputElement).value))
    emit("enter")
}
const enterOnMonth = (e: KeyEvent) => {
    setMonth(parseInt((e.target as HTMLInputElement).value))
    emit("enter")
}
const enterOnDay = (e: KeyEvent) => {
    setDay(parseInt((e.target as HTMLInputElement).value))
    emit("enter")
}
const enterOnHour = (e: KeyEvent) => {
    setHour(parseInt((e.target as HTMLInputElement).value))
    emit("enter")
}
const enterOnMinute = (e: KeyEvent) => {
    setMinute(parseInt((e.target as HTMLInputElement).value))
    emit("enter")
}
const enterOnSecond = (e: KeyEvent) => {
    setSecond(parseInt((e.target as HTMLInputElement).value))
    emit("enter")
}

</script>

<template>
    <div>
        <div class="is-line-height-std">
            <NumberInput size="small" width="half" placeholder="年" :min="1970" :value="value.year" @update:value="setYear" @enter="enterOnYear"/>
            /
            <NumberInput size="small" width="one-third" placeholder="月" :min="1" :max="12" :value="value.month" @update:value="setMonth" @enter="enterOnMonth"/>
            /
            <NumberInput size="small" width="one-third" placeholder="日" :min="1" :max="maxDay" :value="value.day" @update:value="setDay" @enter="enterOnDay"/>
        </div>
        <div class="is-line-height-std">
            <NumberInput size="small" width="half" placeholder="时" :min="0" :max="23" :auto-focus="autoFocus" :value="value.hours" @update:value="setHour" @enter="enterOnHour"/>
            :
            <NumberInput size="small" width="one-third" placeholder="分" :min="0" :max="59" :value="value.minutes" @update:value="setMinute" @enter="enterOnMinute"/>
            :
            <NumberInput size="small" width="one-third" placeholder="秒" :min="0" :max="59" :value="value.seconds" @update:value="setSecond" @enter="enterOnSecond"/>
        </div>
    </div>
</template>

<style module lang="sass">

</style>
