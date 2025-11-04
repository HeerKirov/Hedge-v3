<script setup lang="ts">
import { computed } from "vue"
import { Block, Icon } from "@/components/universal"
import { MetaKeywordDisplay } from "@/components-business/form-display"
import { Author } from "@/functions/http-client/api/author"
import { AUTHOR_TYPE_ICONS } from "@/constants/entity"
import { useAssets } from "@/functions/app"
import { useDraggable } from "@/modules/drag"
import { useListThumbnail } from "@/services/main/author"
import { useMouseHover } from "@/utils/sensors"

const props = defineProps<{
    item: Author
}>()

defineEmits<{
    (e: "click"): void
    (e: "click:illusts", item: Author): void
    (e: "update:favorite", favorite: boolean): void
}>()

const { assetsUrl } = useAssets()

const { thumbnailFiles, exampleCount } = useListThumbnail(computed(() => props.item.id))

const otherNameText = computed(() => {
    if(props.item.otherNames.length > 0) {
        const origin = props.item.otherNames.join(" / ")
        if(origin.length >= 64) {
            return origin.substring(0, 64) + "..."
        }
        return `(${origin})`
    }
    return ""
})

const actualKeywords = computed(() => {
    const max = 12
    const keywordsSize = props.item.keywords.length
    if(keywordsSize <= max) {
        return {
            keywords: props.item.keywords,
            more: false
        }
    }else{
        return {
            keywords: props.item.keywords.slice(0, max),
            more: true
        }
    }
})

const dragEvents = useDraggable("author", () => ({
    id: props.item.id,
    name: props.item.name,
    type: props.item.type,
    color: props.item.color
}))

const { hover, ...hoverEvents } = useMouseHover()

</script>

<template>
    <div :class="$style.item">
        <Block>
            <div :class="$style.upper" v-bind="hoverEvents">
                <div class="flex-item w-100 pt-1 flex column jc-between" @click="$emit('click')">
                    <p :class="{[`has-text-${item.color}`]: !!item.color, 'is-font-size-h4': true}">
                        <Icon class="mr-1" :icon="AUTHOR_TYPE_ICONS[item.type]"/>
                        <span draggable="true" v-bind="dragEvents">{{item.name}}</span>
                    </p>
                    <p class="secondary-text my-1">
                        {{otherNameText}}
                    </p>
                    <div class="flex-item grow-shrink"/>
                    <div :class="[$style.keywords, 'is-scrollbar-hidden']">
                        <MetaKeywordDisplay :value="actualKeywords.keywords" color="secondary"/>
                        <b v-if="actualKeywords.more" class="ml-1 has-text-secondary">...</b>
                    </div>
                </div>
                <div :class="['flex-item', 'no-grow-shrink', $style['score-and-count']]">
                    <div>
                        <Icon :class="{'has-text-danger': item.favorite, 'has-text-secondary': !item.favorite, 'is-hidden': !item.favorite && !hover}" icon="heart" @click="$emit('update:favorite', !item.favorite)"/>
                    </div>
                    <div v-if="item.score !== null">
                        {{item.score ?? 0}}<Icon class="ml-1" icon="star"/>
                    </div>
                    <div v-if="item.count > 0" class="pr-half">
                        {{item.count}}项
                    </div>
                </div>
            </div>
            
            <div :class="[$style.examples, 'is-scrollbar-hidden']">
                <img v-for="file in thumbnailFiles" :key="file" :class="$style.example" :src="assetsUrl(file)" alt="example img" @click="$emit('click:illusts', item)"/>
                <template v-if="thumbnailFiles.length < exampleCount">
                    <div v-for="() in (exampleCount - thumbnailFiles.length)" :class="$style['empty-example']"/>
                </template>
            </div>
        </Block>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/size"
@use "@/styles/base/color"

$example-count: 5
$example-size: 60px

.item
    $height: 190px
    $padding: size.$spacing-2
    $content-height: $height - $padding * 2 - 1px * 2
    height: $height
    padding: $padding    

    > div
        height: 100%
        display: flex
        flex-direction: column
        justify-content: space-between

.upper
    flex: 1 1 auto
    display: flex
    justify-content: stretch
    margin: size.$spacing-2 size.$spacing-2 0 size.$spacing-2
    padding-bottom: size.$spacing-1
    overflow: hidden
    border-bottom: 1px dashed color.$light-mode-border-color
    @media (prefers-color-scheme: dark)
        border-bottom-color: color.$dark-mode-border-color

    .score-and-count
        padding-right: size.$spacing-1
        padding-top: size.$spacing-1
        text-align: right
        display: flex
        flex-direction: column
        justify-content: space-between

    .keywords
        display: flex
        flex-wrap: wrap
        overflow-y: auto
        max-height: 1.75rem

.examples
    flex: 0 0 auto
    padding: size.$spacing-2
    gap: size.$spacing-2
    max-width: 100%
    display: flex
    overflow-x: auto
    align-self: flex-end

    > .example
        width: $example-size
        height: $example-size
        border-radius: 2px
        box-sizing: border-box
        object-fit: cover
        object-position: center
        flex: 0 0 auto

    > .empty-example
        width: $example-size
        height: $example-size
        border: dashed 1px darkgrey
        border-radius: 2px
        box-sizing: border-box
        flex: 0 0 auto
</style>
