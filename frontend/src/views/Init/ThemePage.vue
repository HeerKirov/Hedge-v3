<script setup lang="ts">
import { reactive, watch } from "vue"
import { Button } from "@/components/universal"
import { BottomLayout, Flex } from "@/components/layout"
import { NativeTheme } from "@/functions/ipc-client"
import { useAppearance } from "@/functions/app"

const props = defineProps<{
    theme: NativeTheme
}>()

const emit = defineEmits<{
    (e: "prev"): void
    (e: "submit", theme: NativeTheme): void
}>()

const data = reactive({
    theme: props.theme
})

const submit = () => {
    emit("submit", data.theme)
}

const appearance = useAppearance()

watch(() => data.theme, theme => appearance.value = {theme}, {immediate: true})

</script>

<template>
    <BottomLayout>
        <h3 class="mb-4">选择外观</h3>
        <p class="mb-4">Hedge支持亮色模式，或暗色模式，或跟随系统切换。</p>
        <Flex horizontal="around">
            <div :class="{[$style['theme-select-card']]: true, [$style.selected]: data.theme === 'light'}" @click="data.theme = 'light'">
                <div :class="$style['light-mode']"/>
                亮色模式
            </div>
            <div :class="{[$style['theme-select-card']]: true, [$style.selected]: data.theme === 'dark'}"  @click="data.theme = 'dark'">
                <div :class="$style['dark-mode']"/>
                暗色模式
            </div>
            <div :class="{[$style['theme-select-card']]: true, [$style.selected]: data.theme === 'system'}"  @click="data.theme = 'system'">
                <div :class="$style['system-mode']"/>
                跟随系统
            </div>
        </Flex>
        <template #bottom>
            <Button type="primary" mode="light" icon="arrow-left" @click="$emit('prev')">上一步</Button>
            <Button class="float-right" type="primary" mode="filled" icon="arrow-right" @click="submit">下一步</Button>
        </template>
    </BottomLayout>
</template>

<style module lang="sass">
@import "../../styles/base/color"
@import "../../styles/base/size"

.theme-select-card
    width: 25%
    text-align: center
    &.selected > div
        border: solid 3px $light-mode-primary
        @media (prefers-color-scheme: dark)
            border-color: $dark-mode-primary
    > div
        box-sizing: border-box
        border-radius: $radius-size-std
        border: solid 1px $light-mode-border-color
        height: 6rem
    > .light-mode
        background-color: $light-mode-block-color
    > .dark-mode
        background-color: $dark-mode-block-color
    > .system-mode
        background: linear-gradient(to right bottom, $light-mode-block-color, $light-mode-block-color 50%, $dark-mode-block-color 51%, $dark-mode-block-color)
</style>
