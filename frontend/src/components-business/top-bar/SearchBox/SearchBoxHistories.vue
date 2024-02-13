<script setup lang="ts">
import { computed, ref, toRef } from "vue"
import { SelectList } from "@/components/form"
import { Dialect } from "@/functions/http-client/api/util-query"
import { useFetchEndpoint } from "@/functions/fetch"
import { usePopupMenu } from "@/modules/popup-menu";

const props = defineProps<{
    dialect: Dialect
}>()

const emit = defineEmits<{
    (e: "pick", text: string): void
}>()

const { data, deleteData: clear } = useFetchEndpoint({
    path: toRef(props, "dialect"), 
    get: client => client.queryUtil.history.get,
    delete: client => client.queryUtil.history.clear
})

const selectedIndex = ref<number>()

const items = computed(() => data.value?.map(s => ({label: s, value: s})) ?? [])

const selectListClick = (value: string) => emit("pick", value)

const menu = usePopupMenu([{type: "normal", label: "清除历史记录", click: clear}])

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
    <SelectList v-if="items.length > 0" :items="items" v-model:index="selectedIndex" @click="selectListClick" @contextmenu="menu.popup()" v-slot="{ value, selected, click }">
        <div :class="{[$style['select-list-item']]: true, [$style.selected]: selected}" @click="click">
            {{value}}
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