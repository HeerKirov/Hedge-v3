<script setup lang="ts">
import { computed } from "vue"
import { RelatedSimpleTag } from "@/functions/http-client/api/tag"
import { RelatedSimpleTopic } from "@/functions/http-client/api/topic"
import { RelatedSimpleAuthor } from "@/functions/http-client/api/author"
import { MetaUtilIdentity } from "@/functions/http-client/api/util-meta"
import { Tagme } from "@/functions/http-client/api/illust"
import { useDroppable } from "@/modules/drag"
import { installEditorContext, SetValue, UpdateDataForm } from "./context"
import TopArea from "./TopArea.vue"
import LeftColumn from "./LeftColumn.vue"
import RightColumn from "./RightColumn.vue"

const props = defineProps<{
    tags: RelatedSimpleTag[]
    topics: RelatedSimpleTopic[]
    authors: RelatedSimpleAuthor[]
    tagme?: Tagme[]
    identity?: MetaUtilIdentity | null
    setValue?: SetValue
    allowTagme?: boolean
}>()

const emit = defineEmits<{
    (e: "update", form: UpdateDataForm): void
    (e: "close"): void
}>()

const identity = computed(() => props.identity ?? null)

const data = computed(() => ({
    tags: props.tags,
    topics: props.topics,
    authors: props.authors,
    tagme: props.tagme ?? []
}))

const { form: { add } } = installEditorContext({
    identity,
    data,
    setValue: props.setValue,
    updateValue(form) { emit("update", form) },
    close() { emit("close") }
})

const { dragover: _, ...dropEvents } = useDroppable(["author", "tag", "topic"], (value, type) => add(type, value))

</script>

<template>
    <div :class="$style.root">
        <div :class="$style.top">
            <TopArea :allow-tagme="allowTagme ?? false"/>
        </div>
        <div :class="$style.left" v-bind="dropEvents">
            <LeftColumn/>
        </div>
        <div :class="$style.right">
            <RightColumn/>
        </div>
        <div :class="$style['mid-gap']"/>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/color"
@import "../../../styles/base/size"

.root
    position: relative
    box-sizing: border-box
    height: 100%

    $padding: 0.75rem
    $top-height: 3rem
    $top-real-height: 2.5rem

    > .top
        position: absolute
        top: #{$padding + $top-height - $top-real-height}
        left: $padding
        right: $padding
        height: $top-real-height
        box-sizing: border-box
        border-bottom: solid 1px $light-mode-border-color
        @media (prefers-color-scheme: dark)
            border-bottom-color: $dark-mode-border-color

    > .left
        position: absolute
        top: #{$top-height + $padding}
        left: $padding
        right: 50%
        bottom: 0
        display: flex
        flex-wrap: nowrap
        flex-direction: column

    > .mid-gap
        position: absolute
        border-left: solid 1px $light-mode-border-color
        @media (prefers-color-scheme: dark)
            border-left-color: $dark-mode-border-color
        top: #{$top-height + $padding}
        left: 50%
        width: 0
        bottom: $padding

    > .right
        position: absolute
        top: #{$top-height + $padding}
        right: $padding
        left: 50%
        bottom: 0
        display: flex
        flex-wrap: nowrap
        flex-direction: column
</style>
