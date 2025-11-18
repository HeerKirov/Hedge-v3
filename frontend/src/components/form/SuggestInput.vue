<script setup lang="ts" generic="T">
import { Ref, ref, watch } from "vue"
import { Input, SelectList } from "@/components/form/index"
import { ElementPopupCallout } from "@/components/interaction"
import { KeyEvent, USUAL_KEY_VALIDATORS } from "@/modules/keyboard"
import { useFetchHelper } from "@/functions/fetch"
import { HttpClient, Response } from "@/functions/http-client"

const props = defineProps<{
    /**
     * 文本值。
     */
    value?: string | null | undefined
    /**
     * 内容提示符。
     */
    placeholder?: string
    /**
     * 尺寸大小。
     */
    size?: "small" | "std" | "large"
    /**
     * 宽度。可设为固定宽度或百分比宽度。
     */
    width?: "one-third" | "half" | "three-quarter" | "std" | "medium" | "large" | "2x" | "3x" | "25" | "50" | "75" | "fullwidth"
    /**
     * 当此文本框挂载时，自动聚焦。
     */
    autoFocus?: boolean
    /**
     * 只要内容有变化，就立刻发送update:value事件以同步更新。关闭此选项时，就仅会在失去焦点、按下Enter等时同步更新。
     */
    updateOnInput?: boolean
    /**
     * 查找建议值。当聚焦文本框时，进行一次初始查询。之后当输入文本时，进行查询。
     * @param httpClient
     */
    query?(httpClient: HttpClient): (search: string | undefined) => Promise<Response<T[]>>
    /**
     * 将查找建议值的内容转换为文本。
     * @param item
     */
    mapOption?(item: T): string
}>()

const emit = defineEmits<{
    (e: "update:value", value: string | undefined): void
    (e: "keypress", event: KeyEvent): void
    (e: "enter"): void
}>()

const fetch = props.query && useFetchHelper(props.query)

const active = ref(false)

const selectList: Ref<{label: string, value: T}[]> = ref([])
const selectedIndex = ref<number>()

let forecastTimer: NodeJS.Timeout | null = null
let forecastValue: string | undefined | null = null

watch(() => props.value, v => startForecastTimer(v ?? undefined))

async function forecast() {
    const result = await fetch?.(forecastValue ?? undefined) ?? []
    selectList.value = result.map(item => ({label: props.mapOption ? props.mapOption(item) : (item as string), value: item}))
    active.value = (selectList.value.length > 0)
    forecastValue = null
}

function startForecastTimer(value: string | undefined) {
    if(value !== forecastValue) {
        if(fetch) {
            if(forecastTimer !== null) clearTimeout(forecastTimer)
            forecastValue = value || undefined
            forecastTimer = setTimeout(forecast, 200)
        }
        if(selectList.value.length) {
            selectList.value = []
            selectedIndex.value = undefined
            active.value = false
        }
    }
}

function stopForecastTimer() {
    if(fetch && forecastTimer !== null) {
        clearTimeout(forecastTimer)
        forecastTimer = null
        forecastValue = null
    }
    if(selectList.value.length) {
        selectList.value = []
        selectedIndex.value = undefined
        active.value = false
    }
}

const keypress = (e: KeyEvent) => {
    if(USUAL_KEY_VALIDATORS["Escape"](e)) {
        if(active.value) {
            active.value = false
            stopForecastTimer()
            e.preventDefault()
        }
    }else if(USUAL_KEY_VALIDATORS["Enter"](e)) {
        if(selectedIndex.value === undefined) {
            //在没有选择项时，按下enter不进行拦截，让其触发Input原本的事件
            stopForecastTimer()
        }else if(selectList.value[selectedIndex.value]) {
            //已经有高亮选择项时，按下enter将pick此项
            emit("update:value", selectList.value[selectedIndex.value].label)
            emit("enter")
            e.preventDefault()
        }
    }else if(USUAL_KEY_VALIDATORS["ArrowUp"](e)) {
        if(selectList.value.length) {
            if(selectedIndex.value === undefined) {
                selectedIndex.value = selectList.value.length - 1
            }else if(selectedIndex.value > 0) {
                selectedIndex.value -= 1
            }
        }
        e.preventDefault()
    }else if(USUAL_KEY_VALIDATORS["ArrowDown"](e)) {
        if(selectList.value.length) {
            if(selectedIndex.value === undefined) {
                selectedIndex.value = 0
            }else if(selectedIndex.value < selectList.value.length - 1) {
                selectedIndex.value += 1
            }
        }
        e.preventDefault()
    }else if(USUAL_KEY_VALIDATORS["ArrowLeft"](e) || USUAL_KEY_VALIDATORS["ArrowRight"](e)) {
        stopForecastTimer()
    }else{
        emit("keypress", e)
    }
}

const click = (value: T, _: number) => {
    emit("update:value", props.mapOption ? props.mapOption(value) : (value as string))
    emit("enter")
}

const focus = () => {
    if(!props.value) startForecastTimer(undefined)
}

const compositionEnd = (e: CompositionEvent) => {
    if(e.data.length) {
        startForecastTimer((e.target as HTMLInputElement).value)
    }
}

const input = (e: InputEvent) => {
    if(e.inputType === "insertText" && e.data) {
        startForecastTimer((e.target as HTMLInputElement).value)
    }else{
        stopForecastTimer()
    }
}

</script>

<template>
    <ElementPopupCallout popup-fullwidth v-model:visible="active">
        <Input :value :placeholder :size :width :auto-focus="autoFocus" :updateOnInput blur-on-keypress="Escape"
               @keypress="keypress" @enter="$emit('enter')" @update:value="$emit('update:value', $event)"
               @input="input" @compositionend="compositionEnd" @focus="focus"
        />
        <template #popup>
            <SelectList :class="size ? `is-font-size-${size}` : undefined" :items="selectList" v-model:index="selectedIndex" @click="click"/>
        </template>
    </ElementPopupCallout>
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