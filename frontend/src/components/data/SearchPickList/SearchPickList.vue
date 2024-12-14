<script setup lang="ts" generic="T">
import { ref } from "vue"
import { Input } from "@/components/form"
import { HttpClient, Response, ListResult } from "@/functions/http-client"
import { usePostFetchHelper } from "@/functions/fetch/fetch-helper"
import { KeyEvent, USUAL_KEY_VALIDATORS } from "@/modules/keyboard"
import SearchPickQuery from "./SearchPickQuery.vue"
import SearchPickRecent from "./SearchPickRecent.vue"

// == Search List 搜索列表选择器组件 ==
// 它的构成是一个顶端的搜索框和下面的结果列表。在搜索框输入内容，将调用回调方法执行内容搜索，然后列在列表中。列表中的内容支持continuous加载。
// 此外，它还支持历史记录功能，在未搜索时，调用历史记录回调方法获得历史记录列表。
// SearchList的数据交换类型固定记作any，然而其实际交换类型固定：从query/history等函数读入类型，pick时也交出相同的类型。

const props = defineProps<{
    placeholder?: string
    autoFocus?: boolean
    initSize?: number
    continueSize?: number
    historySize?: number
    query?(httpClient: HttpClient): (offset: number, limit: number, search: string) => Promise<Response<ListResult<T>>>
    historyList?(httpClient: HttpClient): (limit: number) => Promise<Response<T[]>>
    historyPush?(httpClient: HttpClient): (item: T) => Promise<Response<unknown>>
    mapOption?(item: T): {label: string, value: string}
}>()

const emit = defineEmits<{
    (e: "pick", item: T): void
}>()

const queryCompRef = ref<InstanceType<typeof SearchPickQuery>>()
const recentCompRef = ref<InstanceType<typeof SearchPickRecent>>()

const contentType = ref<"recent" | "query">("recent")

const searchKeyword = ref<string>()

const inputText = ref<string>("")

const inputKeypress = (e: KeyEvent) => {
    if(USUAL_KEY_VALIDATORS["Enter"](e)) {
        const inputTextValue = inputText.value.trim() || undefined
        if(inputTextValue !== searchKeyword.value) {
            //关键词改变，则根据内容更新
            if(inputTextValue && props.query) {
                searchKeyword.value = inputTextValue
                contentType.value = "query"
            }else{
                contentType.value = "recent"
                searchKeyword.value = undefined
            }
        }else if(contentType.value === "query") {
            queryCompRef.value?.enter()
        }else{
            recentCompRef.value?.enter()
        }
        e.stopPropagation()
        e.preventDefault()
    }else if(USUAL_KEY_VALIDATORS["ArrowUp"](e)) {
        if(contentType.value === "query") {
            queryCompRef.value?.prev()
        }else{
            recentCompRef.value?.prev()
        }
        e.preventDefault()
    }else if(USUAL_KEY_VALIDATORS["ArrowDown"](e)) {
        if(contentType.value === "query") {
            queryCompRef.value?.next()
        }else{
            recentCompRef.value?.next()
        }
        e.preventDefault()
    }
}

const historyPush = props.historyPush && usePostFetchHelper(props.historyPush)

const pick = (item: any) => {
    historyPush?.(item)
    emit("pick", item)
}

defineSlots<{
    default(props: {item: T}): any
}>()

</script>

<template>
    <div :class="$style.root">
        <Input width="fullwidth" v-model:value="inputText" :placeholder="placeholder" :auto-focus="autoFocus" @keypress="inputKeypress" update-on-input/>
        <SearchPickQuery v-if="contentType === 'query'" 
            ref="queryCompRef" 
            :class="$style.panel" 
            :search-keyword="searchKeyword!" 
            :init-size="initSize ?? 10" 
            :continue-size="continueSize ?? initSize ?? 10"
            :query="query!"
            :map-option="mapOption"
            @pick="pick" 
            v-slot="{ item }">
            <slot :item="item"/>
        </SearchPickQuery>
        <SearchPickRecent v-else
            ref="recentCompRef"
            :class="$style.panel" 
            :history-size="historySize ?? 10"
            :history-list="historyList"
            :map-option="mapOption"
            @pick="pick"
            v-slot="{ item }">
            <slot :item="item"/>
        </SearchPickRecent>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.root
    box-sizing: border-box

.panel
    height: calc(100% - #{size.$element-height-std} - #{size.$spacing-1})
    margin-top: size.$spacing-1
</style>
