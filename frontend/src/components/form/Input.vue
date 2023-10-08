<script setup lang="ts">
import { ComponentPublicInstance, computed, ref, useCssModule, watch, onMounted } from "vue"
import { KeyEvent, KeyPress, toKeyEvent, useInterceptedKey, useKeyDeclaration, USUAL_PRIMITIVE_KEY_VALIDATORS } from "@/modules/keyboard"

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
     * 文本类型。
     */
    type?: "text" | "password" | "number" | "textarea"
    /**
     * 尺寸大小。
     */
    size?: "small" | "std" | "large"
    /**
     * 宽度。可设为固定宽度或百分比宽度。
     */
    width?: "one-third" | "half" | "three-quarter" | "std" | "medium" | "large" | "2x" | "3x" | "25" | "50" | "75" | "fullwidth"
    /**
     * 禁用文本框。
     */
    disabled?: boolean
    /**
     * 当此文本框挂载时，自动聚焦。
     */
    autoFocus?: boolean
    /**
     * 触发onInput事件时，就发送update:value。表现为每一次输入都会触发更新。
     */
    updateOnInput?: boolean
    /**
     * 按下此快捷键时，聚焦到此文本框。
     */
    focusOnKeypress?: KeyPress
}>()

const emit = defineEmits<{
    (e: "update:value", value: string): void
    (e: "keypress", event: KeyEvent): void
    (e: "enter", event: KeyEvent): void
}>()

watch(() => props.value, () => { value.value = props.value ?? "" })

const value = ref(props.value ?? "")

const onUpdate = (e: InputEvent) => {
    value.value = (e.target as HTMLInputElement).value
    emit("update:value", value.value)
}

//按键事件处理
const keyDeclaration = useKeyDeclaration()

//对于Enter按键，有一个快捷事件作响应

const onKeydown = (e: KeyboardEvent) => {
    if(!keyDeclaration.primitiveValidator(e)) {
        e.stopPropagation()
        e.stopImmediatePropagation()
    }
    if(!composition) {
        const keyEvent = toKeyEvent(e)
        emit("keypress", keyEvent)
        //在input中按下Enter时，会直接触发update:value事件，然后触发一个enter事件用于快速处理。
        if(props.type !== "textarea" && USUAL_PRIMITIVE_KEY_VALIDATORS.Enter(e)) {
            value.value = (e.target as HTMLInputElement).value
            emit("update:value", value.value)
            emit("enter", keyEvent)
        }
    }
}

//输入法合成器防抖
let composition = false
const onCompositionstart = () => composition = true
const onCompositionend = () => composition = false

//聚焦用ref
let inputRef: HTMLInputElement | null = null

//按键时聚焦
if(props.focusOnKeypress) useInterceptedKey(props.focusOnKeypress, () => inputRef?.focus())

//挂载时聚焦
if(props.autoFocus) onMounted(() => inputRef?.focus())

//挂载ref回调
const mountedCallback = (props.focusOnKeypress || props.autoFocus || undefined) && async function(el: Element | ComponentPublicInstance | null) {
    const ref = (el as HTMLInputElement | null)
    inputRef = ref
}

const events = {[props.updateOnInput ? "onInput" : "onChange"]: onUpdate, onKeydown, onCompositionstart, onCompositionend}

const style = useCssModule()

const inputClass = computed(() => [
    style.input,
    style[`is-size-${props.size ?? "std"}`],
    props.width ? style[`is-width-${props.width}`] : null
])

</script>

<template>
    <component
        :is="type === 'textarea' ? 'textarea' : 'input'"
        :type="type !== 'textarea' ? (type ?? 'text') : undefined"
        :ref="mountedCallback" :class="inputClass" v-bind="events"
        :disabled="disabled" :placeholder="placeholder" :value="value"
    />
</template>

<style module lang="sass">
@import "../../styles/base/size"
@import "../../styles/base/color"

.input
    vertical-align: middle
    align-items: center
    display: inline-flex
    line-height: 1.2
    padding: 0 calc(0.85em - 1px)
    border-radius: $radius-size-std
    border: 1px solid $light-mode-border-color
    color: $light-mode-text-color
    background-color: $light-mode-block-color
    &[disabled]
        color: mix($light-mode-text-color, #ffffff, 20%)
        background-color: mix($light-mode-block-color, #000000, 96%)
    @media (prefers-color-scheme: dark)
        border-color: $dark-mode-border-color
        color: $dark-mode-text-color
        background-color: $dark-mode-block-color
        &[disabled]
            color: mix($dark-mode-text-color, #000000, 20%)
            background-color: mix($dark-mode-block-color, #FFFFFF, 96%)

textarea.input
    $textarea-max-height: 40em !default
    $textarea-min-height: 6em !default
    padding: calc(0.6em - 1px) calc(0.85em - 1px)
    resize: vertical
    &:not([rows])
        max-height: $textarea-max-height
        min-height: $textarea-min-height
    &[rows]
        height: initial

.is-size-small
    font-size: $font-size-small
    height: $element-height-small
.is-size-std
    font-size: $font-size-std
    height: $element-height-std
.is-size-large
    font-size: $font-size-large
    height: $element-height-large

@each $name, $size in ("one-third" 0.333em, "half" 0.5em, "three-quarter" 0.75em, "std" 1em, "medium" 1.25em, "large" 1.5em, "2x" 2em, "3x" 3em)
    .is-width-#{$name}
        width: #{$size * 13.6}
        max-width: #{$size * 13.6}
@each $name, $size in ("25" 0.25, "50" 0.5, "75" 0.75, "fullwidth" 1)
    .is-width-#{$name}
        width: percentage($size)
        max-width: percentage($size)

</style>
