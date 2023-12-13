<script setup lang="ts">
import { computed } from "vue"
import { Block, Button, Icon } from "@/components/universal"
import { BottomLayout } from "@/components/layout"
import { useAssets } from "@/functions/app"
import { date } from "@/utils/datetime"
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

const { situations, selected, submit } = useCreatingCollectionContext(computed(() => props.p.images), computed(() => props.p.situations), onCreated)

</script>

<template>
    <BottomLayout>
        <p class="mt-2 pl-1 is-font-size-large">合并图像至集合</p>
        <p class="mb-2 pl-1">{{ situations.length > 1 ? '图像分属不同的时间分区，需要选择其一将它们聚集在一起。' : '一些图像已经属于某个集合，或者选中了一些集合作为集合内容。' }}</p>
        <template v-if="situations.length > 1">
            <Block v-for="s in situations" :key="s.partitionTime!.timestamp" :class="$style.item" :color="selected.type === 'partition' && selected.ts === s.partitionTime!.timestamp ? 'primary' : undefined" @click="selected = {type: 'partition', ts: s.partitionTime!.timestamp}">
                <div :class="$style['partition-head']">
                    {{ date.toISOString(s.partitionTime!) }}
                    <p class="mt-1 is-font-size-small">包含{{ s.totalImageCount }}项</p>
                </div>
                <div :class="$style['partition-content']">
                    <Block v-for="c in s.collections" :class="$style['collection-item']" :color="selected.type === 'collection' && selected.id === c.collectionId ? 'primary' : undefined" @click.stop="selected = {type: 'collection', id: c.collectionId}">
                        <img :class="$style.img" :src="assetsUrl(c.childrenExamples[0].filePath.sample)" :alt="`collection ${c.collectionId}`"/>
                        <p><Icon class="mr-2" icon="id-card"/><b class="can-be-selected">{{ c.collectionId }}</b></p>
                        <p class="secondary-text">共{{ c.childrenCount }}项</p>
                    </Block>
                    <div v-for="i in s.images" :class="$style['image-item']">
                        <img :class="$style.img" :src="assetsUrl(i.filePath.sample)" :alt="`image ${i.id}`"/>
                    </div>
                </div>
            </Block>
        </template>
        <template v-else>
            <Block :class="$style.item" :color="selected.type === 'new' ? 'primary' : undefined" @click="selected = {type: 'new'}">
                <div :class="$style['right-column']">
                    <p :class="$style.title">创建全新的集合</p>
                    <p>将选中的图像，及选中集合的图像全部加入新集合。</p>
                </div>
            </Block>
            <Block v-for="s in p.situations[0].collections" :class="$style.item" :color="selected.type === 'collection' && selected.id === s.collectionId ? 'primary' : undefined" @click="selected = {type: 'collection', id: s.collectionId}">
                <div :class="$style['left-column']">
                    <img :class="$style.img" :src="assetsUrl(s.childrenExamples[0].filePath.sample)" :alt="`collection ${s.collectionId}`"/>
                </div>
                <div :class="$style['right-column']">
                    <p :class="$style.title">合并到集合<Icon class="mx-2" icon="id-card"/><b class="can-be-selected">{{s.collectionId}}</b></p>
                    <img v-for="child in s.childrenExamples.slice(1)" :key="child.id" :class="$style['example-img']" :alt="`example ${child.id}`" :src="assetsUrl(child.filePath.sample)"/>
                    <span :class="$style.counter">共{{s.childrenCount}}项</span>
                </div>
            </Block>
        </template>
        <template #bottom>
            <div class="mt-2">
                <span class="is-line-height-std">{{ situations.length > 1 ? selected.type === 'collection' ? '已直接指定一个集合。会将所有项聚集到此集合所在的分区。' : '选择的所有项将聚集到指定的时间分区。选定集合时，优先使用此分区内已存在的集合。' : '选择的所有项都将被合并到选定的集合。' }}</span>
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
        flex-shrink: 0
        > .img
            border-radius: $radius-size-std
            width: 4rem
            height: 4rem
            flex-shrink: 0
            object-fit: cover
    > .right-column
        width: 100%
        padding-left: 0.5rem
        > .title
            margin-bottom: 0.25rem
            font-size: $font-size-large
        > .example-img
            display: inline-block
            border-radius: $radius-size-small
            width: 2rem
            height: 2rem
            object-fit: cover
            margin: 0.25rem 0.25rem 0 0
        > .counter
            margin-left: 0.25rem
    > .partition-head
        width: 6rem
        flex-shrink: 0
    > .partition-content
        width: 100%
        padding-left: 0.5rem
        display: flex
        flex-wrap: nowrap
        overflow-x: auto
        gap: 0.25rem

        .collection-item
            display: inline-block
            padding: 0.25rem
            text-align: center
            > .img
                width: 5rem
                height: 5rem
        .image-item
            display: inline-block
            padding-top: calc(0.25rem + 1px)
            > .img
                width: 4rem
                height: 4rem
        .img
            border-radius: $radius-size-std
            flex-shrink: 0
            object-fit: cover
</style>
