<script setup lang="ts">
import { computed, ref } from "vue"
import { SelectList } from "@/components/form"
import { VisualForecast } from "@/functions/http-client/api/util-query"

const props = defineProps<{
    forecast: VisualForecast
}>()

const emit = defineEmits<{
    (e: "pick", item: VisualForecast["suggestions"][number]): void
}>()

const selectedIndex = ref<number>()

const items = computed(() => props.forecast.suggestions.map(s => ({label: s.name, value: s})))

const selectListClick = (value: VisualForecast["suggestions"][number]) => emit("pick", value)

defineExpose({
    next() {
        if(selectedIndex.value === undefined) {
            selectedIndex.value = 0
        }else if(selectedIndex.value < items.value.length - 1) {
            selectedIndex.value += 1
        }
    },
    prev() {
        if(selectedIndex.value === undefined) {
            selectedIndex.value = items.value.length - 1
        }else if(selectedIndex.value > 0) {
            selectedIndex.value -= 1
        }
    },
    enter() {
        if(selectedIndex.value === undefined) {
            //在搜索关键词内容不变时，按下enter触发的是高亮第一项
            selectedIndex.value = 0
        }else{
            //在进一步，已经有高亮选择项时，按下enter将pick此项
            selectListClick(items.value[selectedIndex.value].value)
        }
    }
})

</script>

<template>
    <SelectList v-bind="$attrs" :items="items" v-model:index="selectedIndex" @click="selectListClick" v-slot="{ value, selected, click }">
        <div :class="{[$style['select-list-item']]: true, [$style.selected]: selected}" @click="click">
            {{value.name}}
            <span v-if="value.aliases.length" class="secondary-text">({{value.aliases.join("/")}})</span>
            <span v-if="value.address?.length" class="secondary-text float-right">[{{value.address.join("/")}}]</span>
        </div>
    </SelectList>
</template>

<style module lang="sass">
@import "../../../styles/base/color"

.select-list-item
    padding: 0.35em
    white-space: nowrap
    overflow: hidden
    border: solid 2px rgba(0, 0, 0, 0)
    &.selected
        border-color: $light-mode-primary
    @media (prefers-color-scheme: dark)
        &.selected
            border-color: $dark-mode-primary
</style>