<script setup lang="ts">
import { useRouter } from "vue-router"
import { Block, Icon } from "@/components/universal"
import { BookCard } from "@/components-business/element"
import { useAssets } from "@/functions/app"
import { useHomepageContext } from "@/services/main/homepage"
import { windowManager } from "@/modules/window"
import { AUTHOR_TYPE_ICONS, TOPIC_TYPE_ICONS } from "@/constants/entity"

const { assetsUrl } = useAssets()

const { 
    loading, data,
    openImport, openBook,
    openPartition, openIllustOfPartition, 
    openAuthorOrTopic, openIllustOfAuthorOrTopic
} = useHomepageContext()

const router = useRouter()

</script>

<template>
    <div v-if="loading || !data?.ready" :class="[$style.root, $style.loading]">
        <label :class="$style.header">随便看看</label>
        <div :class="$style['primary-scroll-area']">
            <div v-for="() in 28" :class="$style.image"/>
            <div class="h-100"/>
            <Block v-for="() in 3" :class="$style.block">
                <div :class="$style['example-area']"/>
            </Block>
        </div>
        <label :class="$style.header">画集推荐</label>
        <div :class="$style['book-scroll-area']">
            <Block v-for="() in 6" :class="$style.book"/>
        </div>
        <label :class="$style.header">最近添加</label>
        <div :class="$style['secondary-scroll-area']">
            <div v-for="() in 8" :class="$style.image"/>
        </div>
    </div>
    <div v-else-if="data && (data.todayImages.length || data.todayAuthorAndTopics.length || data.todayBooks.length || data.recentImages.length || data.historyImages.length)" :class="$style.root">
        <template v-if="data.todayImages.length > 0 || data.todayAuthorAndTopics.length > 0">
            <label :class="$style.header">随便看看</label>
            <div :class="$style['primary-scroll-area']">
                <img v-for="i in data.todayImages" :class="$style.image" :src="assetsUrl(i.filePath.thumbnail)" @click="openIllustOfPartition(i.partitionTime, i.id)"/>
                <div class="h-100"/>
                <Block v-for="i in data.todayAuthorAndTopics" :class="$style.block">
                    <div :class="[$style['title-area'], `has-text-${i.color}`]" @click="openAuthorOrTopic(i.metaType, i.name)">
                        <Icon class="mr-1" :icon="i.metaType === 'AUTHOR' ? AUTHOR_TYPE_ICONS[i.type] : TOPIC_TYPE_ICONS[i.type]"/>{{ i.name }}
                    </div>
                    <div :class="$style['example-area']">
                        <img v-for="j in i.images" :class="$style.example" :src="assetsUrl(j.filePath.thumbnail)" @click="openIllustOfAuthorOrTopic(i.metaType, i.name, j.id)"/>
                        <template v-if="i.images.length < 3">
                            <div v-for="() in (3 - i.images.length)" :class="$style['empty-example']"/>
                        </template>
                    </div>
                </Block>
            </div>
        </template>
        <template v-if="data.todayBooks.length">
            <label :class="$style.header">画集推荐</label>
            <div :class="$style['book-scroll-area']">
                <BookCard v-for="b in data.todayBooks" :class="$style.book" :item="b" @click="openBook(b.id)"/>
            </div>
        </template>
        <template v-if="data.recentImages.length">
            <label :class="$style.header">最近添加</label>
            <div :class="$style['secondary-scroll-area']">
                <img v-for="i in data.recentImages" :class="$style.image" :src="assetsUrl(i.filePath.thumbnail)" @click="openIllustOfPartition(i.partitionTime, i.id)"/>
            </div>
        </template>
        <template v-for="h in data.historyImages">
            <label :class="[$style.header, 'is-cursor-pointer']" @click="openPartition(h.date)">{{ h.date.year }}年{{ h.date.month }}月{{ h.date.day }}日</label>
            <div :class="$style['secondary-scroll-area']">
                <img v-for="i in h.images" :class="$style.image" :src="assetsUrl(i.filePath.thumbnail)" @click="openIllustOfPartition(h.date, i.id)"/>
            </div>
        </template>
    </div>
    <div v-else class="absolute center has-text-centered pb-6">
        <p class="pl-4 mb-4 is-font-size-large">现在没有任何内容…</p>
        <p class="mb-1"><a @click="openImport"><Icon icon="plus-square"/>导入文件</a></p>
        <p><a @click="windowManager.openGuide"><Icon icon="circle-question-regular"/>查看向导</a></p>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
@import "../../../styles/base/color"

$margin-x: $spacing-4

.root
    width: 100%
    height: 100%
    overflow-y: auto

    box-sizing: border-box
    padding: $margin-x 0
    &::-webkit-scrollbar,
    *::-webkit-scrollbar
        display: none

.header
    font-weight: 700
    display: block
    margin-left: $spacing-3
    margin-bottom: $spacing-2
    &:not(:first-child)
        margin-top: $spacing-2

.primary-scroll-area
    $image-width: 8vw
    $image-gap: $spacing-1
    $image-column-num: 4
    $block-column-num: 3
    height: calc(#{$image-width * $image-column-num} + #{$image-gap * ($image-column-num - 1)})
    padding: 0 $margin-x
    overflow-x: auto
    display: flex
    flex-wrap: wrap
    flex-direction: column
    align-content: flex-start
    gap: $image-gap

    > .image
        flex-shrink: 0
        width: $image-width
        height: $image-width
        object-fit: cover
        object-position: center
        cursor: pointer
    > .block
        flex-shrink: 0
        height: calc((#{$image-width * $image-column-num} + #{$image-gap * ($image-column-num - $block-column-num)}) / 3)
        padding: $spacing-2
        > .title-area
            height: $element-height-small
            line-height: $element-height-tiny
            align-items: baseline
            white-space: nowrap
            overflow: hidden
            text-overflow: ellipsis
            cursor: pointer
        > .example-area
            $example-height: calc((#{$image-width * $image-column-num} + #{$image-gap * ($image-column-num - $block-column-num)}) / 3 - #{$element-height-small} - #{$spacing-2 * 2} - 2px)
            height: $example-height
            width: calc(#{$example-height} * 3 + #{$image-gap * 2})
            display: flex
            gap: $image-gap
            > .example
                height: $example-height
                width: $example-height
                border-radius: 2px
                box-sizing: border-box
                object-fit: cover
                object-position: center
                cursor: pointer
            > .empty-example
                width: $example-height
                height: $example-height
                border: dashed 1px darkgrey
                border-radius: 2px
                box-sizing: border-box

.secondary-scroll-area
    $image-width: 8vw
    $image-gap: $spacing-1
    padding: 0 $margin-x
    overflow-x: auto
    display: flex
    gap: $image-gap

    > .image
        flex-shrink: 0
        width: $image-width
        height: $image-width
        object-fit: cover
        object-position: center
        cursor: pointer

.book-scroll-area
    $book-width: 12vw
    $book-aspect: 1.3333
    $book-gap: $spacing-1
    padding: 0 $margin-x
    overflow-x: auto
    display: flex
    gap: $book-gap

    > .book
        flex-shrink: 0
        position: relative
        width: $book-width
        height: #{$book-width * $book-aspect}

.loading
    overflow-y: hidden
    
    .header
        visibility: hidden
    .image
        background-color: $light-mode-block-color
        @media (prefers-color-scheme: dark) 
            background-color: $dark-mode-block-color
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