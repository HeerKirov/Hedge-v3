<script setup lang="ts">
import { computed } from "vue"
import { Block, Button, Icon } from "@/components/universal"
import { BottomLayout } from "@/components/layout"
import { useAssets } from "@/functions/app"
import { CreatingCollectionProps, useCreatingCollectionContext } from "./context"

const props = defineProps<{
    p: CreatingCollectionProps
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const onCreated = (collectionId: number, newCollection: boolean) => {
    props.p.onCreated?.(collectionId, newCollection)
    emit("close")
}

const { assetsUrl } = useAssets()

const { selected, submit } = useCreatingCollectionContext(computed(() => props.p.images), onCreated)

</script>

<template>
    <BottomLayout>
        <template v-if="p.situations.length">
            <p class="mt-2 pl-1 is-font-size-large">合并集合</p>
            <p class="mb-2 pl-1">一些图像已经属于某个集合，或者选中了一些集合作为集合内容。</p>
        </template>
        <template v-else>
            <p class="mt-2 pl-1 is-font-size-large">创建集合</p>
            <p class="mb-2 pl-1">不存在已属于其他集合的图像，这是一次全新的创建。</p>
        </template>
        <Block :class="$style.item" :color="selected === 'new' ? 'primary' : undefined" @click="selected = 'new'">
            <div :class="$style['right-column']">
                <p :class="$style.title">创建全新的集合</p>
                <p>将选中的图像，及选中集合的图像全部加入新集合。</p>
            </div>
        </Block>
        <template v-if="p.situations.length">
            <Block v-for="s in p.situations" :class="$style.item" :color="selected === s.id ? 'primary' : undefined" @click="selected = s.id">
                <div :class="$style['left-column']">
                    <img :class="$style.img" :src="assetsUrl(s.childrenExamples[0].filePath.sample)" :alt="`collection ${s.id} cover`"/>
                </div>
                <div :class="$style['right-column']">
                    <p :class="$style.title">合并到集合<Icon class="mx-2" icon="id-card"/><b class="can-be-selected">{{s.id}}</b></p>
                    <img v-for="child in s.childrenExamples.slice(1)" :key="child.id" :class="$style['example-img']" :alt="`example ${child.id}`" :src="assetsUrl(child.filePath.sample)"/>
                    <span :class="$style.counter">共{{s.childrenCount}}项</span>
                </div>
            </Block>
        </template>
        <template #bottom>
            <div class="mt-2">
                <span v-if="p.situations.length" class="is-line-height-std">合并后，原先的其他集合会被删除。</span>
                <Button class="float-right" mode="filled" type="primary" icon="check" @click="submit">确认</Button>
            </div>
        </template>
    </BottomLayout>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
.item
    margin-top: 0.5rem
    padding: 0.75rem 0.5rem 0.75rem 0.75rem
    display: flex
    flex-wrap: nowrap
    > .left-column
        width: 4rem
        > .img
            border-radius: $radius-size-std
            width: 4rem
            height: 4rem
            flex-shrink: 0
            object-fit: cover
    > .right-column
        padding-left: 0.5rem
        > .title
            margin-bottom: 0.25rem
            font-size: $font-size-large
        > .example-img
            border-radius: $radius-size-small
            width: 2rem
            height: 2rem
            object-fit: cover
            margin: 0.25rem 0.25rem 0 0
        > .counter
            margin-left: 0.25rem
</style>
