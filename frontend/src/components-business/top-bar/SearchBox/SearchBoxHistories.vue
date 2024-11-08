<script setup lang="ts">
import { computed, ref, toRef } from "vue"
import { SelectList } from "@/components/form"
import { Dialect } from "@/functions/http-client/api/util-query"
import { useFetchEndpoint } from "@/functions/fetch"
import { usePopupMenu } from "@/modules/popup-menu"

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
    enter(): boolean {
        if(selectedIndex.value !== undefined) {
            //在进一步，已经有高亮选择项时，按下enter将pick此项
            selectListClick(items.value[selectedIndex.value].value)
            return true
        }
        //history列表并不会在按下enter时直接选中首项。为了给上级这个反馈，此函数有个返回值
        return false
    }
})

</script>

<template>
    <SelectList v-if="items.length > 0" v-bind="$attrs" :items="items" v-model:index="selectedIndex" @click="selectListClick" @contextmenu="menu.popup()" v-slot="{ value, selected, click }">
        <div :class="{[$style['select-list-item']]: true, [$style.selected]: selected}" @click="click">
            {{value}}
        </div>
    </SelectList>
</template>

<style module lang="sass">
@use "@/styles/base/color"

.select-list-item
    padding: 0.35em
    white-space: nowrap
    overflow: hidden
    border: solid 2px rgba(0, 0, 0, 0)
    &.selected
        border-color: color.$light-mode-primary
    @media (prefers-color-scheme: dark)
        &.selected
            border-color: color.$dark-mode-primary
</style>