<script setup lang="ts">
import { AspectGrid, BottomLayout } from "@/components/layout"
import { Button, Icon } from "@/components/universal"
import { useAssets } from "@/functions/app"
import { useAssociateEditorData } from "./context"

const props = defineProps<{
    id: number
    addIds: number[]
    mode: "append" | "override" | "manualEdit"
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const { assetsUrl } = useAssets()

const { images, dropEvents, remove, save } = useAssociateEditorData(props, () => emit("close"))

</script>

<template>
    <BottomLayout v-bind="dropEvents">
        <p class="mt-2 pl-1">
            <span class="is-font-size-large">关联组</span>
            <a class="float-right mr-2" @click="$emit('close')"><Icon icon="close"/>取消编辑</a>
        </p>
        <p class="mb-1 pl-1">将项目拖曳到此处，以添加到此项目的关联组。</p>
        <AspectGrid :column-num="8" :items="images" :spacing="1" v-slot="{ item, index }">
            <img :src="assetsUrl(item.filePath.sample)" :alt="item.filePath.sample"/>
            <div :class="$style['id-badge']">{{ item.id }}</div>
            <Button :class="$style['close-btn']" square size="small" mode="filled" type="danger" icon="close" @click="remove(index)"/>
        </AspectGrid>

        <template #bottom>
            <div class="mt-2 has-text-right">
                <Button mode="filled" type="primary" icon="save" @click="save">保存</Button>
            </div>
        </template>
    </BottomLayout>
</template>

<style module lang="sass">
@use "@/styles/base/size"
@use "@/styles/base/color"

.close-btn
    position: absolute
    right: 1px
    top: 1px

.id-badge
    position: absolute
    left: 0
    bottom: 0
    padding: 1px 4px
    border-top-right-radius: size.$radius-size-std
    border-bottom-left-radius: size.$radius-size-std
    background-color: rgba(0, 0, 0, 0.65)
    color: color.$dark-mode-text-color
</style>