<script setup lang="ts">
import { BrowserTeleport } from "@/components/logical"
import { Block, Button, Icon, LazyImg } from "@/components/universal"
import { BookCard } from "@/components-business/element"
import { useAssets } from "@/functions/app"
import { useHomepageContext } from "@/services/main/homepage"
import { windowManager } from "@/modules/window"
import { AUTHOR_TYPE_ICONS, TOPIC_TYPE_ICONS } from "@/constants/entity"

const { assetsUrl } = useAssets()

const { 
    loading, data, hasNext, next, reset, scroll, scrollRef,
    openImport, openBook,
    openIllustOfPartition,
    openAuthorOrTopic, openIllustOfAuthorOrTopic
} = useHomepageContext()

</script>

<template>
    <BrowserTeleport to="top-bar">
        <Button class="flex-item no-grow-shrink" icon="rotate" square @click="reset"/>
    </BrowserTeleport>
    <div v-if="loading && data.length === 0" class="absolute center has-text-centered pb-6">
        <div class="has-text-centered p-2 w-100"><Icon icon="circle-notch" size="2x" spin/></div>
    </div>
    <div v-else-if="data.length > 0 && data[0].illusts.length > 0" ref="scrollRef" :class="$style.root" @scroll="scroll">
        <template v-for="record in data">
            <div :class="$style['sampled-illusts']">
                <LazyImg v-for="i in record.illusts" :key="i.id" :class="$style.image" :src="assetsUrl(i.filePath.thumbnail)" alt="" @click="openIllustOfPartition(i.partitionTime, i.id)"/>
            </div>
            <div v-if="record.extraType === 'AUTHOR'" :class="$style.extras">
                <Block v-for="i in record.extras.slice(0, 5)" :key="i.id" :class="$style.block">
                    <div :class="[$style['title-area'], `has-text-${i.color}`]" @click="openAuthorOrTopic('AUTHOR', i.name)">
                        <Icon class="mr-1" :icon="AUTHOR_TYPE_ICONS[i.type]"/>{{ i.name }}
                    </div>
                    <div :class="$style['example-area']">
                        <LazyImg v-for="j in i.images" :class="$style.example" :src="assetsUrl(j.filePath.thumbnail)" alt="" @click="openIllustOfAuthorOrTopic('AUTHOR', i.name, j.id)"/>
                        <template v-if="i.images.length < 3">
                            <div v-for="() in (3 - i.images.length)" :class="$style['empty-example']"/>
                        </template>
                    </div>
                </Block>
            </div>
            <div v-else-if="record.extraType === 'TOPIC'" :class="$style.extras">
                <Block v-for="i in record.extras.slice(0, 5)" :key="i.id" :class="$style.block">
                    <div :class="[$style['title-area'], `has-text-${i.color}`]" @click="openAuthorOrTopic('TOPIC', i.name)">
                        <Icon class="mr-1" :icon="TOPIC_TYPE_ICONS[i.type]"/>{{ i.name }}
                    </div>
                    <div :class="$style['example-area']">
                        <LazyImg v-for="j in i.images" :class="$style.example" :src="assetsUrl(j.filePath.thumbnail)" alt="" @click="openIllustOfAuthorOrTopic('TOPIC', i.name, j.id)"/>
                        <template v-if="i.images.length < 3">
                            <div v-for="() in (3 - i.images.length)" :class="$style['empty-example']"/>
                        </template>
                    </div>
                </Block>
            </div>
            <div v-else :class="$style.books">
                <BookCard v-for="b in record.extras" :key="b.id" :class="$style.book" :item="b" @click="openBook(b.id)"/>
            </div>
        </template>
        <div v-if="loading" class="has-text-centered p-2 w-100"><Icon icon="circle-notch" size="2x" spin/></div>
        <Button v-else-if="hasNext" class="w-100" @click="next">查看更多…</Button>
    </div>
    <div v-else class="absolute center has-text-centered pb-6">
        <p class="pl-4 mb-4 is-font-size-large">现在没有任何内容…</p>
        <p class="mb-1"><a @click="openImport"><Icon icon="plus-square"/>导入文件</a></p>
        <p><a @click="windowManager.openGuide"><Icon icon="circle-question-regular"/>查看向导</a></p>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/size"
@use "@/styles/base/color"

.root
    width: 100%
    height: 100%
    overflow-y: auto

    box-sizing: border-box
    padding: size.$spacing-2

    --illust-column-num: 8
    --extra-column-num: 5
    --book-column-num: 9
    @container tab (max-width: 1400px)
        --illust-column-num: 6
    @container tab (max-width: 840px)
        --illust-column-num: 4
        --extra-column-num: 3
        --book-column-num: 3

.sampled-illusts
    $column-num: var(--illust-column-num)
    $gap: size.$spacing-1
    display: flex
    flex-wrap: wrap
    gap: $gap
    margin: size.$spacing-3
    > img
        width: calc((100% - ($column-num - 1) * $gap) / $column-num)
        //border-radius: size.$radius-size-std
        aspect-ratio: 1 / 1
        object-fit: cover
        object-position: center

.extras
    $column-num: var(--extra-column-num)
    $example-num: 3
    $gap: size.$spacing-1
    display: flex
    flex-wrap: wrap
    gap: $gap
    > .block
        flex-shrink: 0
        width: calc((100% - ($column-num - 1) * $gap) / $column-num)
        padding: size.$spacing-1 size.$spacing-2 size.$spacing-5 size.$spacing-2
        > .title-area
            height: size.$element-height-small
            line-height: size.$element-height-tiny
            align-items: baseline
            white-space: nowrap
            overflow: hidden
            text-overflow: ellipsis
            cursor: pointer
        > .example-area
            display: flex
            gap: $gap
            > .example
                width: calc((100% - $gap * ($example-num - 1)) / $example-num)
                aspect-ratio: 1 / 1
                border-radius: 2px
                box-sizing: border-box
                object-fit: cover
                object-position: center
                cursor: pointer
            > .empty-example
                width: calc(100% - $gap * 2 / 3)
                aspect-ratio: 1 / 1
                border: dashed 1px darkgrey
                border-radius: 2px
                box-sizing: border-box

.books
    $column-num: var(--book-column-num)
    $gap: size.$spacing-3
    display: flex
    flex-wrap: wrap
    gap: $gap
    > .book
        flex-shrink: 0
        position: relative
        width: calc((100% - ($column-num - 1) * $gap) / $column-num)
        aspect-ratio: 3 / 4
        margin: 0

.loading
    overflow-y: hidden
    
    .header
        visibility: hidden
    .image
        background-color: color.$light-mode-block-color
        @media (prefers-color-scheme: dark) 
            background-color: color.$dark-mode-block-color
    .block, .book
        border-width: 0
    .image, .block, .book
        animation: std 4s infinite linear alternate forwards 1s
        @keyframes std
            25%
                opacity: 100%
            50%
                opacity: 30%
</style>