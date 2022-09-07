<script setup lang="ts">
import { Button } from "@/components/universal"
import { Group } from "@/components/layout"
import { MessageBoxButton } from "@/services/module/message-box"
import { useInterceptedKey } from "@/services/module/keyboard"

const props = defineProps<{
    title?: string
    message: string
    detailMessage?: string
    buttons: MessageBoxButton[]
    enter?: string
}>()

const emit = defineEmits<{
    (e: "click", action: string): void
}>()

if(props.enter) useInterceptedKey("Enter", () => {
    if(props.enter) {
        emit("click", props.enter)
    }
})

</script>

<template>
    <div :class="$style.content">
        <p :class="$style.title">{{title}}</p>
        <p :class="$style.message">{{message}}</p>
        <p v-if="!!detailMessage" :class="$style.detailMessage">{{detailMessage}}</p>
        <Group :class="$style.buttons">
            <Button v-for="btn in buttons" :class="$style.button" :type="btn.type" :icon="btn.icon" @click="$emit('click', btn.action)">
                {{btn.name ?? btn.action}}
            </Button>
        </Group>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
@import "../../../styles/base/color"

.content
    padding: $spacing-2
    max-width: 12.5rem
    text-align: center
    > .title
        font-size: $font-size-large
        margin-bottom: $spacing-4
    > .message
        margin: 0 #{$spacing-3} #{$spacing-1} #{$spacing-3}
    > .detail-message
        margin: 0 #{$spacing-3}
        color: $light-mode-secondary-text-color
        @media (prefers-color-scheme: dark)
            color: $dark-mode-secondary-text-color
    > .buttons
        margin-top: $spacing-4
        > .button
            min-width: 4rem
</style>
