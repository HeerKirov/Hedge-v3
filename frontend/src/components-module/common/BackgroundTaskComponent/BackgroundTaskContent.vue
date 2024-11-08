<script setup lang="ts">
import { BottomLayout, MiddleLayout } from "@/components/layout"
import { Separator } from "@/components/universal"
import { BackgroundTaskType } from "@/functions/http-client/api/homepage"
import { useDataContext } from "./context"

const emit = defineEmits<{
    (e: "close"): void
}>()

const { backgroundTasks } = useDataContext()

const TASK_NAMES: Record<BackgroundTaskType, string> = {
    "FILE_ARCHIVE": "文件归档",
    "FILE_GENERATE": "文件图像生成",
    "FIND_SIMILARITY": "查找相似项",
    "EXPORT_ILLUST_METADATA": "图库项目属性推导",
    "EXPORT_BOOK_METADATA": "画集属性推导",
    "EXPORT_ILLUST_BOOK_RELATION": "集合的画集关系推导",
    "EXPORT_ILLUST_FOLDER_RELATION": "集合的目录关系推导",
}

</script>

<template>
    <BottomLayout>
        <template #top>
            <MiddleLayout class="px-1 mt-1 mb-1 is-element-height-std">
                <template #left>
                    <span class="is-font-size-large ml-2">进行中的任务</span>
                </template>
            </MiddleLayout>
            <Separator direction="horizontal" :spacing="0"/>
        </template>

        <div v-if="!backgroundTasks?.length" class="has-text-centered secondary-text">
            <i>没有正在进行中的任务</i>
        </div>
        <template v-for="(task, i) in backgroundTasks" :key="task.type">
            <Separator v-if="i > 0" direction="horizontal" :spacing="1"/>
            <div :class="$style.task">
                <div :class="$style.title">
                    {{ TASK_NAMES[task.type] }}
                    <span class="float-right">{{ task.currentValue }}/{{ task.maxValue }}</span>
                </div>
                <progress :class="$style.progress" :value="task.currentValue" :max="task.maxValue"/>
            </div>
        </template>
    </BottomLayout>
</template>

<style module lang="sass">
@use "sass:color" as sass-color
@use "@/styles/base/size"
@use "@/styles/base/color"

.task
    margin: size.$spacing-half size.$spacing-1
    padding: size.$spacing-1 size.$spacing-1 size.$spacing-half size.$spacing-1
    border-radius: size.$radius-size-large

    &:first-child
        margin-top: size.$spacing-1
    &:last-child
        margin-bottom: size.$spacing-1

    &:hover
        background-color: sass-color.mix(color.$light-mode-block-color, #000000, 95%)

.title
    padding: 0 size.$spacing-1

.progress
    width: 100%
    height: 8px
    border: 1px solid color.$light-mode-border-color
    border-radius: size.$radius-size-round
    vertical-align: 0

    &::-webkit-progress-bar
        background-color: color.$light-mode-background-color
        border-radius: size.$radius-size-round

    &::-webkit-progress-value
        background-color: color.$light-mode-primary
        border-radius: 5px

    @media (prefers-color-scheme: dark)
        border-color: color.$dark-mode-border-color

        &::-webkit-progress-bar
            background-color: color.$dark-mode-background-color

        &::-webkit-progress-value
            background-color: color.$dark-mode-primary

</style>