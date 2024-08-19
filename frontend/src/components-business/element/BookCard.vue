<script setup lang="ts" generic="T extends BookCardItem">
import { onMounted, Ref, ref, toRef } from "vue"
import { Block, Icon } from "@/components/universal"
import { useAssets } from "@/functions/app"

const props = defineProps<{
    item: T
    selected?: boolean
}>()

const emit = defineEmits<{
    (e: "click", item: T): void
    (e: "dblclick", item: T): void
    (e: "contextmenu", item: T): void
}>()

const { assetsUrl } = useAssets()

const item: Ref<BookCardItem> = toRef(props, "item")
const imgRef = ref<HTMLImageElement>()
const imgAspectRatio = ref<number>(0)

const imageLoad = () => imgAspectRatio.value = imgRef.value?.complete ? imgRef.value.naturalWidth / imgRef.value.naturalHeight : 0

onMounted(imageLoad)

const click = () => emit("click", props.item)
const dblclick = () => emit("dblclick", props.item)
const contextmenu = () => emit("contextmenu", props.item)

</script>

<script lang="ts">
import { FilePath } from "@/functions/http-client/api/all"

export interface BookCardItem {
    id: number
    title: string
    filePath: FilePath | null
    favorite: boolean
    imageCount: number
}
</script>

<template>
    <Block :class="{[$style.root]: true, [$style.selected]: selected}" @click="click" @dblclick="dblclick" @contextmenu="contextmenu">
        <img ref="imgRef"
             :class="{[$style.img]: true, [$style.blur]: imgAspectRatio >= 1}"
             :src="assetsUrl(item.filePath?.thumbnail)" :alt="item.title"
             @load="imageLoad"/>
        <img v-if="imgAspectRatio >= 1"
             :class="$style['horizontal-img']"
             :style="{ 'top': `${numbers.round2decimal(50 - 37.5 / imgAspectRatio)}%` }"
             :src="assetsUrl(item.filePath?.thumbnail)" :alt="item.title"/>
        <Icon v-if="item.favorite" :class="$style.fav" icon="heart"/>
        <div :class="$style['num-tag']"><Icon v-if="item.imageCount" class="mr-half" icon="images"/>{{item.imageCount || '(空)'}}</div>
        <div :class="$style.info">
            <span v-if="item.title" class="selectable">{{item.title}}</span>
            <span v-else><Icon class="mr-2" icon="id-card"/><span class="selectable">{{item.id}}</span></span>
        </div>
    </Block>
</template>

<style module lang="sass">
@import "../../styles/base/color"
@import "../../styles/base/size"

//horizontal模式下，img的margin-top有一个固定计算公式。若aspect为1时下限为A，aspect趋向于无穷大时上限为B，则最终公式为marginTop=(A-B)/aspect+B
.root
    position: absolute
    top: 0
    bottom: 0
    left: 0
    right: 0
    margin: 0.25rem
    overflow: hidden

    &.selected
        outline: solid 2px $light-mode-primary
        @media (prefers-color-scheme: dark)
            outline-color: $dark-mode-primary

    > .img
        position: absolute
        top: 0
        left: 0
        width: 100%
        height: 100%
        object-position: center
        object-fit: cover
        &.blur
            filter: blur(10px)

    > .horizontal-img
        position: absolute
        left: 0
        width: 100%
        object-position: center
        object-fit: contain

    > .fav
        position: absolute
        left: 0.35rem
        top: 0.5rem
        color: $dark-mode-text-color
        filter: drop-shadow(0 0 1px $dark-mode-background-color)

    > .num-tag
        position: absolute
        right: 0.25rem
        top: 0.25rem
        padding: 0.25rem 0.35rem
        border-radius: $radius-size-std
        color: $dark-mode-text-color
        background-color: rgba(0, 0, 0, 0.65)

    > .info
        position: absolute
        bottom: 0
        left: 0
        right: 0
        max-height: 30%
        padding: 0.5rem 0.25rem
        overflow-y: auto
        box-sizing: border-box
        background: linear-gradient(to top, rgba(0, 0, 0, 50%), rgba(0, 0, 0, 0%))
        color: $light-mode-text-inverted-color
        font-weight: 700
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 50%)
        &::-webkit-scrollbar
            display: none
</style>
