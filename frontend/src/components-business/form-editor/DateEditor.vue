<script setup lang="ts">
import { computed } from "vue"
import { NumberInput } from "@/components/form"
import { date, getDaysOfMonth, LocalDate } from "@/utils/datetime"
import { KeyEvent } from "@/modules/keyboard"

const props = defineProps<{
    value: LocalDate
}>()

const emit = defineEmits<{
    (e: "update:value", value: LocalDate): void
}>()

const maxDay = computed(() => props.value ? getDaysOfMonth(props.value.year, props.value.month) : undefined)

const setYear = (year: number) => emit("update:value", date.withYear(props.value, year))
const setMonth = (month: number) => emit("update:value", date.withMonth(props.value, month))
const setDay = (day: number) => emit("update:value", date.withDay(props.value, day))

const enterOnYear = (e: KeyEvent) => setYear(parseInt((e.target as HTMLInputElement).value))
const enterOnMonth = (e: KeyEvent) => setMonth(parseInt((e.target as HTMLInputElement).value))
const enterOnDay = (e: KeyEvent) => setDay(parseInt((e.target as HTMLInputElement).value))

</script>

<template>
    <div class="is-line-height-std">
        <NumberInput size="small" width="half" placeholder="年" :min="1970" :value="value.year" @update:value="setYear" @enter="enterOnYear"/>
        /
        <NumberInput size="small" width="one-third" placeholder="月" :min="1" :max="12" :value="value.month" @update:value="setMonth" @enter="enterOnMonth"/>
        /
        <NumberInput size="small" width="one-third" placeholder="日" :min="1" :max="maxDay" :value="value.day" @update:value="setDay" @enter="enterOnDay"/>
    </div>
</template>

<style module lang="sass">

</style>
