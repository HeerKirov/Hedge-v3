<script setup lang="ts">
import { Button, Block } from "@/components/universal"
import { Input } from "@/components/form"
import { BottomLayout, MiddleLayout } from "@/components/layout"
import { useNoteDetailContext } from "@/services/main/note"
import { useAppEnv } from "@/functions/app"

const { platform } = useAppEnv()

const { paneState, form, setTitle, setContent, submit, toggleCompleted, togglePinned, deleteItem } = useNoteDetailContext()

</script>

<template>
    <BottomLayout class="fixed">
        <template #top>
            <MiddleLayout :class="['p-1', 'app-region', platform === 'darwin' ? $style['darwin-margin'] : null]">
                <template #left>
                    <Button square icon="arrow-left" @click="paneState.closeView"/>
                </template>
                <template #right>
                    <Button v-if="paneState.mode.value === 'detail'" square type="danger" icon="trash" @click="deleteItem"/>
                </template>
            </MiddleLayout>
        </template>

        <template #gap>
            <Block :class="$style.block">
                <div :class="$style.title">
                    <Button v-if="!form.pinned" round square :mode="form.completed ? 'light' : undefined" :type="form.completed ? 'primary' : 'secondary'" icon="check" @click="toggleCompleted"/>
                    <Input tabindex="1" size="large" auto-focus :value="form.title" update-on-input @update:value="setTitle" @enter="submit" @change="submit"/>
                    <Button square :type="form.pinned ? 'primary' : 'secondary'" icon="lock" @click="togglePinned"/>
                </div>
                <Input :class="$style.content" tabindex="2" type="textarea" :value="form.content" update-on-input @update:value="setContent" @change="submit"/>
            </Block>
        </template>
    </BottomLayout>
</template>

<style module lang="sass">
@use "sass:math"
@use "@/styles/base/size"
@use "@/styles/base/color"

.darwin-margin
    $content-margin-size: math.div(size.$title-bar-height - size.$element-height-std, 2)
    padding-left: #{$content-margin-size + size.$macos-buttons-width}

.block
    padding: size.$spacing-1
    margin: 0 size.$spacing-2 size.$spacing-2 size.$spacing-2
    height: 100%
    display: flex
    flex-direction: column

.title
    display: flex
    flex-wrap: nowrap
    align-items: center
    margin: size.$spacing-2
    border-bottom: solid 1px color.$light-mode-border-color
    @media (prefers-color-scheme: dark)
        border-bottom-color: color.$dark-mode-border-color
    > input
        border: none
        width: 100%
        font-weight: 700
    > button
        flex-shrink: 0
.content
    border: none
    width: 100%
    height: 100%
    padding: size.$spacing-3 size.$spacing-5 size.$spacing-3 size.$spacing-5 !important
    max-height: none !important
    resize: none !important
</style>