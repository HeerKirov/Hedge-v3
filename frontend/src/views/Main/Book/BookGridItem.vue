<script setup lang="ts">
import { Block, Icon } from "@/components/universal"
import { Book } from "@/functions/http-client/api/book"
import { useAssets } from "@/functions/app"

const props = defineProps<{
    item: Book
    selected: boolean
}>()

const emit = defineEmits<{
    (e: "click", item: Book): void
    (e: "dblclick", item: Book): void
    (e: "contextmenu", item: Book): void
}>()

const { assetsUrl } = useAssets()

const click = () => emit("click", props.item)
const dblclick = () => emit("dblclick", props.item)
const contextmenu = () => emit("contextmenu", props.item)

</script>

<template>
    <div :class="$style.root">
        <Block :class="{[$style.content]: true, [$style.selected]: selected}" @contextmenu="contextmenu">
            <img :class="$style.img" :src="assetsUrl(item.filePath?.thumbnail)" :alt="item.title" @click="click" @dblclick="dblclick"/>
            <Icon v-if="item.favorite" :class="$style.fav" icon="heart"/>
            <div :class="$style.info">
                <span v-if="item.imageCount > 0" class="float-right">(<b>{{item.imageCount}}</b>)</span>
                <span v-else class="float-right has-text-secondary">(空)</span>
                <span v-if="item.title" class="selectable is-cursor-pointer" @click="click" @dblclick="dblclick">{{item.title}}</span>
                <span v-else class="is-cursor-pointer" @click="click" @dblclick="dblclick"><Icon class="mr-2" icon="id-card"/><span class="selectable">{{item.id}}</span></span>
            </div>
        </Block>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/color"

//book grid item采用4:3+1:3的比例
.root
    position: relative
    height: 0
    width: calc(100% / var(--column-num))
    padding: calc(50% / var(--column-num) * 5 / 3) 0

    > .content
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
            width: 100%
            height: 80%
            object-position: center
            object-fit: cover

        > .fav
            position: absolute
            right: 0.35rem
            bottom: calc(0.35rem + 20%)
            color: $dark-mode-text-color
            filter: drop-shadow(0 0 1px $dark-mode-background-color)

        > .info
            position: absolute
            bottom: 0
            left: 0
            right: 0
            height: 20%
            padding: 0.5rem
            overflow-y: auto
            box-sizing: border-box
            &::-webkit-scrollbar
               display: none
</style>
