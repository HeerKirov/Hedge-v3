<script setup lang="ts">
import { computed } from "vue"
import { Block, Icon } from "@/components/universal"
import { MetaKeywordDisplay } from "@/components-business/form-display"
import { Flex, FlexItem } from "@/components/layout"
import { TOPIC_TYPE_ICONS } from "@/constants/entity"
import { Topic } from "@/functions/http-client/api/topic"
import { useDraggable } from "@/modules/drag"
import { useMouseHover } from "@/utils/sensors"

const props = defineProps<{
    item: Topic
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

const actualKeywords = computed(() => {
    const max = 6
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


const dragEvents = useDraggable("topic", () => ({
    id: props.item.id,
    name: props.item.name,
    type: props.item.type,
    color: props.item.color
}))

const { hover, ...hoverEvents } = useMouseHover()

</script>

<template>
    <Block :class="$style.item" v-bind="hoverEvents">
        <Flex horizontal="stretch" align="center">
            <FlexItem :width="55">
                <div @click="$emit('click')">
                    <Icon :class="{[`has-text-${item.color}`]: !!item.color, 'mr-1': true}" :icon="TOPIC_TYPE_ICONS[item.type]"/>
                    <span :class="{[`has-text-${item.color}`]: !!item.color}" draggable="true" v-bind="dragEvents">{{item.name}}</span>
                    <span class="secondary-text ml-1">{{otherNameText}}</span>
                    <div v-if="item.parentRoot !== null" class="float-right is-font-size-small">
                        <Icon class="mr-1" :icon="TOPIC_TYPE_ICONS[item.parentRoot.type]"/>
                        <span>{{item.parentRoot.name}}</span>
                    </div>
                </div>
            </FlexItem>
            <FlexItem :shrink="0" :grow="0">
                <div :class="$style.favorite">
                    <Icon v-if="item.favorite" class="has-text-danger" icon="heart" @click="$emit('update:favorite', false)"/>
                    <Icon v-else-if="hover" class="has-text-secondary" icon="heart" @click="$emit('update:favorite', true)"/>
                </div>
            </FlexItem>
            <FlexItem :width="45">
                <div class="flex">
                    <MetaKeywordDisplay :value="actualKeywords.keywords" color="secondary" :multiline="false"/>
                    <b v-if="actualKeywords.more" class="ml-1 has-text-secondary">...</b>
                </div>
            </FlexItem>
            <FlexItem :shrink="0" :grow="0">
                <div :class="$style.score">
                    <template v-if="item.score !== null">
                        {{item.score ?? 0}}<Icon class="ml-1" icon="star"/>
                    </template>
                </div>
            </FlexItem>
            <FlexItem :shrink="0" :grow="0">
                <div :class="$style.count">
                    {{item.count ? `${item.count}项` : ''}}
                </div>
            </FlexItem>
        </Flex>
    </Block>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.item
    height: 40px
    padding: 0 size.$spacing-2
    margin-bottom: 4px

    > div
        height: 100%

        > .favorite
            width: 48px
            text-align: center
        > .score
            width: 40px
            text-align: right
        > .count
            width: 75px
            text-align: right
</style>
