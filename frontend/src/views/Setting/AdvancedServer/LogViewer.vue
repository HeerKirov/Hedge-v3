<script setup lang="ts">
import { nextTick, useTemplateRef, watch } from "vue"
import { Button } from "@/components/universal"
import { BasePane, PaneLayout } from "@/components/layout"
import { useServerStatus } from "@/functions/app"
import { useLogViewer } from "@/services/setting"
import { openLocalFile } from "@/modules/others"

defineProps<{
    mode?: "remote" | "local"
}>()

defineEmits<{
    (e: "close"): void
}>()

const server = useServerStatus()

const { logFiles, selected, data } = useLogViewer()

const contentRef = useTemplateRef<HTMLDivElement>("content")

watch(data, async (_, o) => {
    if(!o || (contentRef.value && contentRef.value.scrollTop + contentRef.value.clientHeight >= contentRef.value.scrollHeight)) {
        await nextTick()
        if(contentRef.value) contentRef.value.scroll({top: contentRef.value.scrollHeight})
    }
})

const openInExternal = () => {
    if(selected.value) openLocalFile(`${server.value.staticInfo.logPath}/${selected.value}`)
}

</script>

<template>
    <PaneLayout :class="$style.root" show-pane>
        <template #pane>
            <BasePane @close="$emit('close')">
                <Button v-for="item in logFiles" :key="item"
                        :class="$style['file-item']"
                        icon="file" size="small"
                        :mode="selected === item ? 'filled' : undefined"
                        :type="selected === item ? 'primary' : undefined"
                        @click="selected = item">
                    {{ item }}
                </Button>

                <template #bottom>
                    <Button v-if="mode === 'local'" class="w-100" icon="file-waveform" @click="openInExternal">在外部打开日志文件</Button>
                </template>
            </BasePane>
        </template>

        <div ref="content" :class="$style.content">
            <pre>{{ data }}</pre>
        </div>
    </PaneLayout>
</template>

<style module lang="sass">
@use "@/styles/base/color"
@use "@/styles/base/size"

.root
    position: absolute
    width: 100%
    height: 100%
    top: 0
    left: 0
    background-color: color.$light-mode-background-color
    @media (prefers-color-scheme: dark)
        background-color: color.$dark-mode-border-color

.content
    height: 100%
    width: 100%
    padding: size.$spacing-2
    overflow: auto

.file-item
    width: 100%
    text-align: left
    font-size: size.$font-size-std
</style>