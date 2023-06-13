<script setup lang="ts">
import { computed, ref } from "vue"
import { Block } from "@/components/universal"
import { SelectList } from "@/components/form"
import { useFetchReactive } from "@/functions/fetch"
import { HttpClient, Response } from "@/functions/http-client"

const props = defineProps<{
    historySize: number
    historyList?(httpClient: HttpClient): (limit: number) => Promise<Response<any[]>>
    mapOption?(item: any): {label: string, value: string}
}>()

const emit = defineEmits<{
    (e: "pick", item: any): void
}>()

const historyData = props.historyList && useFetchReactive({
    get: client => {
        const request = props.historyList!(client)
        return () => request(props.historySize)
    }
})

const selectedIndex = ref<number>()

const selectItems = computed(() => historyData?.data.value?.map(props.mapOption ?? (i => i as {label: string, value: string})) ?? [])

const selectListClick = (_: string, idx: number) => {
    emit("pick", historyData!.data.value![idx])
}

defineExpose({
    next() {
        if(selectItems.value.length > 0) {
            if(selectedIndex.value === undefined) {
                selectedIndex.value = 0
            }else if(selectedIndex.value < selectItems.value.length - 1) {
                selectedIndex.value += 1
            }
        }
    },
    prev() {
        if(selectItems.value.length > 0) {
            if(selectedIndex.value === undefined) {
                selectedIndex.value = 0
            }else if(selectedIndex.value > 0) {
                selectedIndex.value -= 1
            }
        }
    },
    enter() {
        if(selectItems.value.length > 0) {
            if(selectedIndex.value === undefined) {
                //在搜索关键词内容不变时，按下enter触发的是高亮第一项
                selectedIndex.value = 0
            }else{
                //在进一步，已经有高亮选择项时，按下enter将pick此项
                selectListClick(selectItems.value[selectedIndex.value].value, selectedIndex.value)
            }
        }
    }
})

</script>

<template>
    <SelectList v-if="historyData?.data.value?.length" :items="selectItems" v-model:index="selectedIndex" @click="selectListClick" v-slot="{ index, selected, click }">
        <div :class="{[$style['select-list-item']]: true, [$style.selected]: selected}" @click="click">
            <slot :item="historyData!.data.value[index]"/>
        </div>
    </SelectList>
    <Block v-else class="has-text-centered secondary-text" mode="transparent">
        <i>无最近使用项</i>
    </Block>
</template>

<style module lang="sass">
@import "../../../styles/base/color"

.select-list-item
    padding: 0.3em 0.35em
    white-space: nowrap
    overflow: hidden
    border: solid 2px rgba(0, 0, 0, 0)
    &.selected
        border-color: $light-mode-primary
    @media (prefers-color-scheme: dark)
        &.selected
            border-color: $dark-mode-primary
</style>