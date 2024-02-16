<script setup lang="ts">
import { ComponentPublicInstance, ref, watch } from "vue"
import { Input } from "@/components/form"
import { Button, Icon } from "@/components/universal"
import { ElementPopupCallout } from "@/components/interaction"
import { QueryResult } from "@/components-business/top-bar"
import { Dialect, QueryRes } from "@/functions/http-client/api/util-query"
import { usePostPathFetchHelper } from "@/functions/fetch"
import { createKeyEventValidator, KeyEvent, USUAL_KEY_VALIDATORS } from "@/modules/keyboard"
import { computedEffect, computedMutable } from "@/utils/reactivity"
import { useForecast } from "./context"
import SearchBoxSuggestions from "./SearchBoxSuggestions.vue"
import SearchBoxHistories from "./SearchBoxHistories.vue"
import TimeCostDiv from "@/components-business/top-bar/SearchBox/TimeCostDiv.vue";

const props = defineProps<{
    value?: string
    placeholder?: string
    schema?: QueryRes | null
    timeCost?: number | null
    dialect?: Dialect
}>()

const emit = defineEmits<{
    (e: "update:value", search: string | undefined): void
    (e: "enter", newValue: boolean): void
}>()

const fetchPushHistory = usePostPathFetchHelper(client => client.queryUtil.history.push)

const inputRef = ref<ComponentPublicInstance>()

const suggestionRef = ref<InstanceType<typeof SearchBoxSuggestions>>()
const historyRef = ref<InstanceType<typeof SearchBoxHistories>>()

const textValue = computedMutable(() => props.value)

const hasValue = computedEffect(() => !!(props.value || textValue.value))

const active = ref(false)

const showSchema = ref(false)

const showHistory = ref(true)

watch(active, a => { if(a) showSchema.value = true })
watch(() => props.schema, s => { if(s && (s.errors.length || s.warnings.length)) showSchema.value = true })
watch(textValue, (t, o) => { if(!showHistory.value && o && !t) showHistory.value = true })

const { startForecastTimer, stopForecastTimer, forecast, pickSuggestion } = useForecast(inputRef, textValue, props.dialect)

const updateValue = (newValue: string | undefined) => {
    textValue.value = newValue
    emit("update:value", newValue)
    emit("enter", newValue !== props.value)
    if(props.dialect !== undefined && newValue !== props.value && newValue) {
        fetchPushHistory(props.dialect, newValue).finally()
    }
}

const focusKey = createKeyEventValidator("Meta+KeyF")

const keypress = (e: KeyEvent) => {
    if(USUAL_KEY_VALIDATORS["Escape"](e)) {
        if(suggestionRef.value) {
            stopForecastTimer()
            e.preventDefault()
        }else if(historyRef.value) {
            showHistory.value = false
            e.preventDefault()
        }else{
            if(active.value) active.value = false
            stopForecastTimer()
        }
        
    }else if(USUAL_KEY_VALIDATORS["Enter"](e)) {
        if(suggestionRef.value) {
            suggestionRef.value.enter()
            e.preventDefault()
        }else if(!textValue.value && props.dialect !== undefined && historyRef.value) {
            if(historyRef.value.enter()) {
                e.preventDefault()
            }else{
                updateValue(textValue.value || undefined)
                stopForecastTimer()
            }
        }else{
            updateValue(textValue.value || undefined)
            stopForecastTimer()
        }
    }else if(USUAL_KEY_VALIDATORS["ArrowUp"](e)) {
        if(suggestionRef.value) {
            suggestionRef.value.prev()
        }else if(!textValue.value && props.dialect !== undefined && historyRef.value) {
            historyRef.value.prev()
        }
        e.preventDefault()
    }else if(USUAL_KEY_VALIDATORS["ArrowDown"](e)) {
        if(suggestionRef.value) {
            suggestionRef.value.next()
        }else if(!textValue.value && props.dialect !== undefined && historyRef.value) {
            historyRef.value.next()
        }
        e.preventDefault()
    }else if(USUAL_KEY_VALIDATORS["ArrowLeft"](e) || USUAL_KEY_VALIDATORS["ArrowRight"](e)) {
        stopForecastTimer()
    }else if(focusKey(e)) {
        //按下Meta+F时，若schema隐藏，使其重新显示
        if(active.value && !showSchema.value) showSchema.value = true
    }
}

const focus = () => active.value = true

const blur = () => stopForecastTimer()

const compositionEnd = (e: CompositionEvent) => {
    if(e.data.length) {
        startForecastTimer()
        if(showSchema.value) showSchema.value = false
    }
}

const input = (e: InputEvent) => {
    if(e.inputType === "insertText" && e.data && ((e.data >= "a" && e.data <= "z") || (e.data >= "A" && e.data <= "Z") || (e.data >= "0" && e.data <= "9"))) {
        startForecastTimer()
    }else{
        stopForecastTimer()
    }
    if(showSchema.value) showSchema.value = false
    /* 智能输入功能还处于不可用阶段。
        1. 暂时无法处理删除时的回退逻辑，无法得知删除的内容是什么；
        2. 无法与undo/redo正确联动，因此使用体验不佳。
    if(inputRef.value) {
        const el = (inputRef.value.$el as HTMLInputElement)
        if(el.selectionStart !== null) {
            const idx = el.selectionStart
            if(e.inputType === "insertText" && (e.data === "(" || e.data === "[" || e.data === "{" || e.data === "'" || e.data === "\"" || e.data === "`")) {
                const target = e.data === "(" ? ")" : e.data === "[" ? "]" : e.data === "{" ? "}" : e.data
                sleep(0).then(() => {
                    el.value = el.value.substring(0, idx) + target + el.value.substring(idx)
                    el.selectionStart = el.selectionEnd = idx
                })
            }else if(e.inputType === "insertText" && (e.data === ")" || e.data === "]" || e.data === "}" || e.data === "'" || e.data === "\"" || e.data === "`")) {
                const target = e.data === ")" ? "(" : e.data === "]" ? "[" : e.data === "}" ? "{" : e.data
                if(idx >= 2 && el.value[idx - 2] === target && el.value[idx] === e.data) {
                    sleep(0).then(() => {
                        el.value = el.value.substring(0, idx - 1) + el.value.substring(idx)
                        el.selectionStart = el.selectionEnd = idx
                    })
                }
            }else if(e.inputType === "deleteContentBackward" && (e.data === "(" || e.data === "[" || e.data === "{" || e.data === "'" || e.data === "\"" || e.data === "`")) {
                const target = e.data === "(" ? ")" : e.data === "[" ? "]" : e.data === "{" ? "}" : e.data
                if(el.value[idx] === target) {
                    sleep(0).then(() => {
                        el.value = el.value.substring(0, idx) + el.value.substring(idx + 1)
                    })
                }
            }

        }
    }
     */
}

const click = () => {
    //点击文本框时，若schema隐藏，使其重新显示
    if(!showSchema.value) showSchema.value = true
}

const clear = () => {
    if(props.value) {
        emit("update:value", "")
    }else if(textValue.value) {
        textValue.value = undefined
    }
    stopForecastTimer()
}

</script>

<template>
    <ElementPopupCallout v-model:visible="active">
        <div :class="{[$style['search-input']]: true, [$style.expand]: active || hasValue}">
            <Input ref="inputRef"
                :class="{[$style.input]: true, [$style.focus]: active, [$style['has-value']]: hasValue, [$style['has-warning']]: schema && (schema.warnings.length || schema.errors.length)}"
                :placeholder="placeholder" v-model:value="textValue" update-on-input
                focus-on-keypress="Meta+KeyF" blur-on-keypress="Escape"
                @keypress="keypress" @focus="focus" @blur="blur" @input="input"
                @compositionend="compositionEnd" @click="click"
            />
            <Button
                v-if="hasValue"
                :class="$style['clear-button']"
                icon="close" size="tiny" square
                @click="clear"
            />
            <div v-if="schema && (schema.warnings.length || schema.errors.length)" :class="$style['warning-badge']">
                <Icon class="has-text-danger" icon="exclamation-triangle"/>
                <span class="mr-1">{{schema.errors.length ?? 0}}</span>
                <Icon class="has-text-warning" icon="exclamation-triangle"/>
                <span class="mr-1">{{schema.warnings.length ?? 0}}</span>
            </div>
        </div>
        <template #popup>
            <SearchBoxSuggestions v-if="forecast" ref="suggestionRef" :class="$style.popup" :forecast="forecast" @pick="pickSuggestion"/>
            <SearchBoxHistories v-else-if="showHistory && !textValue && dialect !== undefined" ref="historyRef" :class="$style.popup" :dialect="dialect" :time-cost="timeCost" @pick="updateValue"/>
            <template v-else-if="showSchema && schema">
                <QueryResult :class="$style.popup" :schema="schema"/>
                <TimeCostDiv :class="$style.popup" :time-cost="timeCost"/>
            </template>
        </template>
    </ElementPopupCallout>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
@import "../../../styles/base/color"

$collapse-width: 130px
$expand-width: 260px
$warning-badge-width: 50px

.search-input
    position: relative
    transition: width 0.1s ease-in-out

    width: $collapse-width
    &.expand
        width: $expand-width

    .input
        -webkit-app-region: none
        position: absolute
        padding-left: $spacing-2
        width: 100%
        border: none
        border-bottom: solid $light-mode-border-color 1px
        border-radius: $radius-size-std $radius-size-std 0 0
        @media (prefers-color-scheme: dark)
            border-bottom-color: $dark-mode-border-color
        &:focus,
        &.focus
            background-color: mix($light-mode-block-color, #000000, 96%)
            @media (prefers-color-scheme: dark)
                background-color: mix($dark-mode-block-color, #000000, 65%)
        &.has-value
            padding-right: #{calc($element-height-std - ($element-height-std - $element-height-tiny) / 2)}
        &.has-warning
            padding-right: #{calc($element-height-std + $warning-badge-width - ($element-height-std - $element-height-tiny) / 2)}

    .clear-button
        position: absolute
        font-size: $font-size-small
        right: #{calc(($element-height-std - $element-height-tiny) / 2 + 1px)}
        top: #{calc(($element-height-std - $element-height-tiny) / 2)}
        > svg
            transform: translateY(1px)

    .warning-badge
        position: absolute
        right: #{calc(($element-height-std - $element-height-tiny) / 2 + $element-height-tiny + 1px)}
        top: #{calc(($element-height-std - $element-height-tiny) / 2)}
        height: $element-height-tiny
        width: $warning-badge-width
        line-height: $element-height-tiny
        font-size: $font-size-tiny
        pointer-events: none
        padding: 0

.popup
    width: $expand-width
</style>