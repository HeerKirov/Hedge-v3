<script setup lang="ts">
import { computed } from "vue"
import { Block, Icon, Tag } from "@/components/universal"
import { Flex, FlexItem, Group } from "@/components/layout"
import { AnnotationElement } from "@/components-business/element"
import { Author } from "@/functions/http-client/api/author"
import { AUTHOR_TYPE_ICONS } from "@/constants/entity"
import { useDraggable } from "@/modules/drag"
import { useMouseHover } from "@/utils/sensors"

const props = defineProps<{
    item: Author
}>()

const emit = defineEmits<{
    (e: "click"): void
    (e: "update:favorite", favorite: boolean): void
}>()

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

const actualKeywordsAndAnnotations = computed(() => {
    const max = 12
    const keywordsSize = props.item.keywords.length, annotationsSize = props.item.annotations.length
    if(keywordsSize + annotationsSize <= max) {
        return {
            keywords: props.item.keywords,
            annotations: props.item.annotations,
            more: false
        }
    }else if(annotationsSize < max) {
        return {
            keywords: props.item.keywords.slice(0, max - annotationsSize),
            annotations: props.item.annotations,
            more: true
        }
    }else{
        return {
            keywords: [],
            annotations: props.item.annotations.slice(0, max),
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
                <Group class="pt-2 is-overflow-y-auto">
                    <AnnotationElement v-for="a in actualKeywordsAndAnnotations.annotations" :key="a.id" :value="a"/>
                    <Tag v-for="k in actualKeywordsAndAnnotations.keywords" color="secondary">{{k}}</Tag>
                    <Tag v-if="actualKeywordsAndAnnotations.more" color="secondary">...</Tag>
                </Group>
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
                    <!-- TODO 完成author列表的examples -->
                    <div/>
                    <div/>
                    <div/>
                </div>
            </FlexItem>
        </Flex>
    </Block>
</template>

<style module lang="sass">
@import "../../../styles/base/size"

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
            padding-top: $spacing-2

        > .score-and-count
            width: 40px
            padding-right: $spacing-1
            padding-top: $spacing-1
            text-align: right
            position: relative

        > .examples
            display: flex
            gap: 4px
            width: #{4px * 2 + $content-height * 3}
            > div
                width: $content-height
                height: $content-height
                border: dashed 1px darkgrey
                border-radius: 2px
                box-sizing: border-box
</style>
