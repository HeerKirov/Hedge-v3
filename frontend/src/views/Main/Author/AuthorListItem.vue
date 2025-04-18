<script setup lang="ts">
import { computed } from "vue"
import { Block, Icon } from "@/components/universal"
import { MetaKeywordDisplay } from "@/components-business/form-display"
import { Flex, FlexItem } from "@/components/layout"
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
    (e: "update:favorite", favorite: boolean): void
}>()

const { assetsUrl } = useAssets()

const { thumbnailFiles } = useListThumbnail(computed(() => props.item.id))

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
    <Block :class="$style.item" v-bind="hoverEvents">
        <Flex horizontal="stretch">
            <FlexItem :width="60">
                <div class="pt-1" @click="$emit('click')">
                    <p :class="{[`has-text-${item.color}`]: !!item.color, 'is-font-size-large': true}">
                        <Icon class="mr-1" :icon="AUTHOR_TYPE_ICONS[item.type]"/>
                        <span draggable="true" v-bind="dragEvents">{{item.name}}</span>
                    </p>
                    <p class="secondary-text mt-2">
                        {{otherNameText}}
                    </p>
                </div>
            </FlexItem>
            <FlexItem :shrink="0" :grow="0">
                <div :class="$style.favorite">
                    <Icon v-if="item.favorite" class="has-text-danger" icon="heart" @click="$emit('update:favorite', false)"/>
                    <Icon v-else-if="hover" class="has-text-secondary" icon="heart" @click="$emit('update:favorite', true)"/>
                </div>
            </FlexItem>
            <FlexItem :width="40">
                <div class="pt-2 flex multiline is-overflow-y-auto">
                    <MetaKeywordDisplay :value="actualKeywords.keywords" color="secondary"/>
                    <b v-if="actualKeywords.more" class="ml-1 has-text-secondary">...</b>
                </div>
            </FlexItem>
            <FlexItem :shrink="0" :grow="0">
                <div :class="$style['score-and-count']">
                    <div v-if="item.score !== null">
                        {{item.score ?? 0}}<Icon class="ml-1" icon="star"/>
                    </div>
                    <div v-if="item.count > 0" class="absolute bottom-right pr-1">
                        {{item.count}}项
                    </div>
                </div>
            </FlexItem>
            <FlexItem :shrink="0" :grow="0">
                <div :class="$style.examples">
                    <img v-for="file in thumbnailFiles" :key="file" :class="$style.example" :src="assetsUrl(file)" alt="example img"/>
                    <template v-if="thumbnailFiles.length < 3">
                        <div v-for="() in (3 - thumbnailFiles.length)" :class="$style['empty-example']"/>
                    </template>
                </div>
            </FlexItem>
        </Flex>
    </Block>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.item
    $height: 76px
    $padding: 8px
    $content-height: $height - $padding * 2 - 1px * 2
    height: $height
    margin-bottom: 4px
    padding: $padding

    > div
        height: 100%

        > .favorite
            width: 48px
            text-align: center
            padding-top: size.$spacing-2

        > .score-and-count
            width: 52px
            padding-right: size.$spacing-1
            padding-top: size.$spacing-1
            text-align: right
            position: relative

        > .examples
            display: flex
            gap: 4px
            width: #{4px * 2 + $content-height * 3}
            > .example
                width: $content-height
                height: $content-height
                border-radius: 2px
                box-sizing: border-box
                object-fit: cover
                object-position: center

            > .empty-example
                width: $content-height
                height: $content-height
                border: dashed 1px darkgrey
                border-radius: 2px
                box-sizing: border-box
</style>
