<script setup lang="ts">
import { computed } from "vue"
import { CheckBox } from "@/components/form"
import { AspectGrid, BottomLayout } from "@/components/layout"
import { Button } from "@/components/universal"
import { useAssets } from "@/functions/app"
import { OrganizeIllustProps, useOrganizeIllustContext } from "./context"

const props = defineProps<{
    p: OrganizeIllustProps
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const imageIds = computed(() => props.p.images)

const onSucceed = () => {
    props.p.onSucceed?.()
    emit("close")
}

const { assetsUrl } = useAssets()

const { form, formAnyChanged, images, loading, data, reloadData, apply } = useOrganizeIllustContext(imageIds, onSucceed)

</script>

<template>
    <BottomLayout>
        <p class="mt-2 pl-1 is-font-size-large">快捷整理</p>
        <p v-if="loading" class="pl-1">正在生成预览…</p>
        <p v-else class="pl-1">已生成整理预览。共有{{ images?.length }}个图像，将生成{{ data?.filter(i => i.length > 1).length }}个集合。</p>
        <AspectGrid :items="images" :column-num="8" :aspect="1" v-slot="{ item }">
            <img :class="{[$style.img]: true, [$style.first]: item.groupFirst, [$style.last]: item.groupLast, [$style.group]: item.groupColor !== null, [$style[`is-${item.groupColor}`]]: item.groupColor !== null}" :src="assetsUrl(item.filePath.sample)" :alt="item.filePath.sample ?? 'null'"/>
        </AspectGrid>
        <template #bottom>
            <div class="mt-2">
                <CheckBox class="mr-2" v-model:value="form.onlyNeighbours">仅合并邻近项</CheckBox>
                <CheckBox class="mr-2" :disabled="form.onlyNeighbours" v-model:value="form.gatherGroup">把组内的项聚到一起</CheckBox>
                <CheckBox class="mr-2" v-model:value="form.resortAtAll">整理前全局排序</CheckBox>
                <CheckBox class="mr-2" :disabled="form.resortAtAll" v-model:value="form.resortInGroup">整理后组内排序</CheckBox>
                <Button :mode="formAnyChanged ? 'light' : undefined" type="primary" icon="rotate" :disabled="!formAnyChanged" @click="reloadData">重新生成</Button>
                <Button class="float-right" mode="filled" type="primary" icon="check" :disabled="loading" @click="apply">应用整理</Button>
            </div>
        </template>
    </BottomLayout>
</template>

<style module lang="sass">
@import "../../../styles/base/color"

.img
    border-radius: 0 !important
    border-style: solid
    border-width: 5px
    box-sizing: border-box
    &.group:not(.first)
        border-left-width: 0
    &.group:not(.last)
        border-right-width: 0
    &:not(.group)
        border-left-width: 4px
        border-right-width: 4px
    @media (prefers-color-scheme: light)
        border-color: $light-mode-block-color
        @each $name, $color in $light-mode-colors
            &.is-#{$name}
                border-top-color: $color
                border-bottom-color: $color
                &.first
                    border-left-color: $color
                &.last
                    border-right-color: $color

    @media (prefers-color-scheme: dark)
        border-color: $dark-mode-block-color
        @each $name, $color in $dark-mode-colors
            &.is-#{$name}
                border-top-color: $color
                border-bottom-color: $color
                &.first
                    border-left-color: $color
                &.last
                    border-right-color: $color
</style>