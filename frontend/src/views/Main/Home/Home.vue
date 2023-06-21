<script setup lang="ts">
import { Block, Icon } from "@/components/universal"
import { TopBarLayout } from "@/components/layout"
import { useAssets } from "@/functions/app"
import { useHomepageContext } from "@/services/main/homepage"
import { AUTHOR_TYPE_ICONS, TOPIC_TYPE_ICONS } from "@/constants/entity"

const { assetsUrl } = useAssets()

const { 
    loading, data, 
    openBook, openIllustOfRecent,
    openPartition, openIllustOfPartition, 
    openAuthorOrTopic, openIllustOfAuthorOrTopic
} = useHomepageContext()

</script>

<template>
    <TopBarLayout>
        <div v-if="loading" class="relative w-100 h-100">
            <div class="absolute center has-text-centered">
                <Icon icon="circle-notch" size="3x" spin/>
            </div>
        </div>
        <div v-else-if="!!data" :class="$style.root">
            <label :class="$style.header">随便看看</label>
            <div :class="$style['primary-scroll-area']">
                <img v-for="i in data.todayImages" :class="$style.image" :src="assetsUrl(i.thumbnailFile)" @click="openIllustOfPartition(i.partitionTime, i.id)"/>
                <div class="h-100"/>
                <Block v-for="i in data.todayAuthorAndTopics" :class="$style.block">
                    <div :class="[$style['title-area'], `has-text-${i.color}`]" @click="openAuthorOrTopic(i.metaType, i.name)">
                        <Icon class="mr-1" :icon="i.metaType === 'AUTHOR' ? AUTHOR_TYPE_ICONS[i.type] : TOPIC_TYPE_ICONS[i.type]"/>{{ i.name }}
                    </div>
                    <div :class="$style['example-area']">
                        <img v-for="j in i.images" :class="$style.example" :src="assetsUrl(j.thumbnailFile)" @click="openIllustOfAuthorOrTopic(i.metaType, i.name, j.id)"/>
                        <template v-if="i.images.length < 3">
                            <div v-for="_ in (3 - i.images.length)" :class="$style['empty-example']"/>
                        </template>
                    </div>
                </Block>
            </div>
            <label :class="$style.header">画集推荐</label>
            <div :class="$style['book-scroll-area']">
                <Block v-for="b in data.todayBooks" :class="$style.book">
                    <img :class="$style.img" :src="assetsUrl(b.thumbnailFile)" @click="openBook(b.id)"/>
                    <Icon :class="['has-text-danger', $style.fav]" icon="heart"/>
                    <div :class="$style.info">
                        <span v-if="b.imageCount > 0" class="float-right">(<b>{{ b.imageCount }}</b>)</span>
                        <span v-else class="float-right has-text-secondary">(空)</span>
                        <span v-if="b.title" class="selectable is-cursor-pointer" @click="openBook(b.id)">{{ b.title }}</span>
                        <span v-else class="is-cursor-pointer" @click="openBook(b.id)"><Icon class="mr-2" icon="id-card"/><span class="selectable">{{ b.id }}</span></span>
                    </div>
                </Block>
            </div>
            <template v-if="data.recentImages.length">
                <label :class="$style.header">最近添加</label>
                <div :class="$style['secondary-scroll-area']">
                    <img v-for="i in data.recentImages" :class="$style.image" :src="assetsUrl(i.thumbnailFile)" @click="openIllustOfRecent(i.id)"/>
                </div>
            </template>
            <template v-for="h in data.historyImages">
                <label :class="[$style.header, 'is-cursor-pointer']" @click="openPartition(h.date)">{{ h.date.year }}年{{ h.date.month }}月{{ h.date.day }}日</label>
                <div :class="$style['secondary-scroll-area']">
                    <img v-for="i in h.images" :class="$style.image" :src="assetsUrl(i.thumbnailFile)" @click="openIllustOfPartition(h.date, i.id)"/>
                </div>
            </template>
        </div>
    </TopBarLayout>
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
        overflow: hidden
        > .img
            width: 100%
            height: 80%
            object-position: center
            object-fit: cover
            cursor: pointer
        > .fav
            position: absolute
            right: 0.35rem
            bottom: calc(0.35rem + 20%)
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