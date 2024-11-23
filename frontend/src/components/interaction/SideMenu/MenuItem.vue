<script setup lang="ts">
import { computed, onBeforeMount, onUnmounted, useCssModule, watch } from "vue"
import { Icon } from "@/components/universal"
import { installParentContext, MenuBadge, useMenuContext, useParentContext } from "./context"

const props = defineProps<{
    id: string
    label: string
    icon?: string
    badge?: MenuBadge
    disabled?: boolean
}>()

const emit = defineEmits<{
    (e: "click", event: MouseEvent): void
    (e: "contextmenu", event: MouseEvent): void
}>()

const { itemStatus, selected, setSelected } = useMenuContext()

const parentContext = useParentContext()

const childrenContext = parentContext === undefined ? installParentContext() : undefined

const currentSelected = computed(() => selected.value === props.id)

const isOpened = computed({
    get: () => itemStatus[props.id] ?? true,
    set: value => { itemStatus[props.id] = value }
})

const click = (e: MouseEvent) => {
    if(!currentSelected.value) {
        setSelected(props.id)
    }
    emit("click", e)
}

const rightClick = (e: MouseEvent) => {
    emit("contextmenu", e)
}

const clickCollapse = (e: MouseEvent) => {
    isOpened.value = !isOpened.value
    e.stopPropagation()
}

const badges = computed(() => {
    if(props.badge === null || props.badge === undefined) {
        return []
    }else if(typeof props.badge === "number" || typeof props.badge === "string") {
        return [{count: props.badge, type: "std" as const}]
    }else if(props.badge instanceof Array) {
        return props.badge
    }else{
        return [props.badge]
    }
})

const style = useCssModule()

const divClass = computed(() => [
    style.button,
    parentContext !== undefined ? style["sub-item"] : undefined,
    currentSelected.value ? style.selected : childrenContext?.subSelected?.value !== undefined ? style.subSelected : style.general
])

if(parentContext !== undefined) {
    watch(currentSelected, newVal => {
        if(newVal && parentContext.subSelected.value !== props.id) parentContext.subSelected.value = props.id
        else if(!newVal && parentContext.subSelected.value === props.id) parentContext.subSelected.value = undefined
    })
}

onBeforeMount(() => {
    if(parentContext !== undefined) parentContext.count.value += 1
})

onUnmounted(() => {
    if(parentContext !== undefined) parentContext.count.value -= 1
})

</script>

<template>
    <button :class="divClass" @click="click" @contextmenu="rightClick">
        <Icon v-if="icon" class="flex-item no-grow-shrink" :icon="icon"/>
        <span class="ml-2 flex-item w-100">{{label}}</span>
        <span v-for="badge in badges" :class="[$style.badge, $style[badge.type]]">{{ badge.count }}</span>
        <span v-if="childrenContext?.count?.value" :class="$style.caret" @click="clickCollapse">
            <Icon :icon="isOpened ? 'caret-down' : 'caret-right'"/>
        </span>
    </button>
    <slot v-if="isOpened"/>
</template>

<style module lang="sass">
@use "@/styles/base/size"
@use "@/styles/base/color"

.button
    box-sizing: border-box
    display: flex
    align-items: center
    justify-content: stretch
    white-space: nowrap
    overflow: hidden
    border-radius: size.$radius-size-std
    text-align: left
    margin-top: size.$spacing-1
    padding: 0 1em
    height: size.$element-height-std
    width: 100%
    font-size: size.$font-size-std
    &.sub-item
        margin-top: size.$spacing-half
        padding: 0 0.5em 0 1em
        height: 30px
        > span:first-child
            margin-left: calc(1.25em + #{size.$spacing-2})

@media (prefers-color-scheme: light)
    .general
        background-color: rgba(#ffffff, 0)
        color: color.$light-mode-text-color

    .sub-selected
        background-color: rgba(#ffffff, 0)
        color: color.$light-mode-primary

    .general,
    .sub-selected
        &:hover:not([disabled])
            background-color: rgba(45, 50, 55, 0.09)
        &:active:not([disabled])
            background-color: rgba(45, 50, 55, 0.13)
        &[disabled]
            color: color.$light-mode-secondary-text-color

    .selected
        color: color.$light-mode-primary
        background-color: rgba(color.$light-mode-primary, 0.15)
        &:hover:not([disabled])
            background-color: rgba(color.$light-mode-primary, 0.2)
        &:active:not([disabled])
            background-color: rgba(color.$light-mode-primary, 0.28)
        &[disabled]
            color: color.$light-mode-secondary-text-color

    .badge
        &.std
            background-color: rgba(#000000, 0.08)
        &.danger
            background-color: rgba(color.$light-mode-danger, 0.3)

@media (prefers-color-scheme: dark)
    .general
        background-color: rgba(#000000, 0)
        color: color.$dark-mode-text-color

    .sub-selected
        background-color: rgba(#000000, 0)
        color: color.$dark-mode-primary

    .general,
    .sub-selected
        &:hover:not([disabled])
            background-color: rgba(255, 255, 255, 0.09)
        &:active:not([disabled])
            background-color: rgba(255, 255, 255, 0.13)
        &[disabled]
            color: color.$dark-mode-secondary-text-color

    .selected
        color: color.$dark-mode-primary
        background-color: rgba(color.$dark-mode-primary, 0.15)
        &:hover:not([disabled])
            background-color: rgba(color.$dark-mode-primary, 0.2)
        &:active:not([disabled])
            background-color: rgba(color.$dark-mode-primary, 0.28)
        &[disabled]
            color: color.$dark-mode-secondary-text-color

    .badge
        background-color: rgba(#000000, 0.3)
        &.danger
            color: color.$dark-mode-danger

.badge
    flex: 0 0 auto
    padding: 2px 6px
    margin-left: 2px
    border-radius: size.$radius-size-std
    font-weight: 700

.caret
    flex: 0 0 auto
    transform: translate(3px, 0px)
</style>
