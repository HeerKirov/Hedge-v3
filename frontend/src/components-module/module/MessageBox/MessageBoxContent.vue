<script setup lang="ts">
import { reactive } from "vue"
import { Button } from "@/components/universal"
import { Group } from "@/components/layout"
import { CheckBox } from "@/components/form"
import { MessageBoxButton, MessageBoxCheckBox } from "@/modules/message-box"
import { useInterceptedKey } from "@/modules/keyboard"

const props = defineProps<{
    title?: string
    message: string
    detailMessage?: string
    buttons: MessageBoxButton[]
    checks?: MessageBoxCheckBox[]
    enter?: string
}>()

const emit = defineEmits<{
    (e: "click", action: string, checks: string[]): void
}>()

if(props.enter) useInterceptedKey("Enter", () => { if(props.enter) click(props.enter) })

const checkValues = reactive<Record<string, boolean>>({})
props.checks?.filter(c => c.defaultValue !== undefined).forEach(c => checkValues[c.key] = c.defaultValue!)

const click = (action: string) => {
    const checks = Object.entries(checkValues).filter(([_, v]) => v).map(([k, _]) => k)
    emit("click", action, checks)
}

</script>

<template>
    <div :class="$style.content">
        <p :class="$style.title">{{title}}</p>
        <p :class="$style.message">{{message}}</p>
        <p v-if="!!detailMessage" :class="$style.detailMessage">{{detailMessage}}</p>
        <div v-if="checks?.length" class="mt-2">
            <p v-for="check in checks" class="mt-half"><CheckBox v-model:value="checkValues[check.key]">{{check.name ?? check.key}}</CheckBox></p>
        </div>
        <Group :class="$style.buttons">
            <Button v-for="btn in buttons" :class="$style.button" :type="btn.type" :icon="btn.icon" @click="click(btn.action)">{{btn.name ?? btn.action}}</Button>
        </Group>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
@import "../../../styles/base/color"

.content
    padding: $spacing-2
    max-width: 15rem
    text-align: center
    > .title
        font-size: $font-size-large
        margin-bottom: $spacing-4
    > .message
        margin: 0 #{$spacing-3} #{$spacing-1} #{$spacing-3}
    > .detail-message
        margin: 0 #{$spacing-3}
        color: $light-mode-secondary-text-color
        font-size: $font-size-small
        @media (prefers-color-scheme: dark)
            color: $dark-mode-secondary-text-color
    > .buttons
        margin-top: $spacing-3
        > .button
            min-width: 4rem
</style>
