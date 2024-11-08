<script setup lang="ts">
import { ref, watch, computed } from "vue"
import { Block } from "@/components/universal"
import { SelectList } from "@/components/form"
import { HttpClient, Response, ListResult } from "@/functions/http-client"
import { useQueryContinuousListView } from "@/functions/fetch"

const props = defineProps<{
    searchKeyword: string
    initSize: number
    continueSize: number
    query(httpClient: HttpClient): (offset: number, limit: number, search: string) => Promise<Response<ListResult<any>>>
    mapOption?(item: any): {label: string, value: string}
}>()

const emit = defineEmits<{
    (e: "pick", item: any): void
}>()

const listview = useQueryContinuousListView({
    request: client => {
        const query = props.query(client)
        return (offset, limit) => query(offset, limit, props.searchKeyword)
    },
    initSize: props.initSize,
    continueSize: props.continueSize,
    autoInitialize: true
})

watch(() => props.searchKeyword, () => {
    listview.reset()
    selectedIndex.value = undefined
})

//什么情况下显示或不显示more？
//  初次加载，也就是loading && total === 0时，不显示
//  确定没有新数据，也就是!loading && total <= result.length时，不显示
//  其余情况应该都是显示的，但loading时不响应触发
const showMore = computed(() =>
    (listview.loading.value || listview.data.value.total > listview.data.value.result.length) &&
    (!listview.loading.value || listview.data.value.total > 0))

const selectedIndex = ref<number>()

const selectItems = computed(() => {
    const items = listview.data.value.result.map(props.mapOption ?? (i => i as {label: string, value: string}))
    return showMore.value ? items.concat({label: "加载更多…", value: "<more>"}) : items
})

const selectListClick = (value: string, idx: number) => {
    //直接点击某项的情况下，pick此项
    if(value === "<more>") {
        listview.next()
    }else{
        emit("pick", listview.data.value.result[idx])
    }
}

defineExpose({
    next() {
        if(selectedIndex.value === undefined) {
            selectedIndex.value = 0
        }else if(selectedIndex.value < selectItems.value.length - 1) {
            selectedIndex.value += 1
        }
    },
    prev() {
        if(selectedIndex.value === undefined) {
            selectedIndex.value = 0
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
            selectListClick(selectItems.value[selectedIndex.value].value, selectedIndex.value)
        }
    }
})

</script>

<template>
    <SelectList v-if="listview.loading.value || listview.data.value.total" :items="selectItems" v-model:index="selectedIndex" @click="selectListClick" v-slot="{ index, label, value, selected, click }">
        <div v-if="value === '<more>'" :class="{[$style['select-list-item']]: true, [$style.selected]: selected}" @click="click">
            <i>{{label}}</i>
        </div>
        <div v-else :class="{[$style['select-list-item']]: true, [$style.selected]: selected}" @click="click">
            <slot :item="listview.data.value.result[index]"/>
        </div>
    </SelectList>
    <Block v-else class="has-text-centered secondary-text" mode="transparent">
        <i>无搜索结果</i>
    </Block>
</template>

<style module lang="sass">
@use "@/styles/base/color"

.select-list-item
    padding: 0.4em 0.35em
    white-space: nowrap
    overflow: hidden
    border: solid 2px rgba(0, 0, 0, 0)
    &.selected
        border-color: color.$light-mode-primary
    @media (prefers-color-scheme: dark)
        &.selected
            border-color: color.$dark-mode-primary
</style>