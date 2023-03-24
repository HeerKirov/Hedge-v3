<script setup lang="ts">
import { computed } from "vue"
import { CheckBox } from "@/components/form"
import { Button, Icon } from "@/components/universal"
import { BottomLayout, AspectGrid } from "@/components/layout"
import { useAssets } from "@/functions/app"
import { AddToCollectionProps, useAddToCollectionContext } from "./context"

const props = defineProps<{
    p: AddToCollectionProps
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const { assetsUrl } = useAssets()

const { selections, selectedCount, anyHasParent, selectAll, selectReverse, submit } = useAddToCollectionContext(
    computed(() => props.p.images),
    computed(() => props.p.collectionId),
    computed(() => props.p.situations),
    () => {
        props.p.onAdded?.()
        emit("close")
    })

</script>

<template>
    <BottomLayout>
        <p class="mt-2 pl-1 is-font-size-large">添加图像到集合</p>
        <p class="mb-2 pl-1">将图像添加到此集合。选择并确认需要添加的图像：</p>
        <AspectGrid :spacing="1" :column-num="7" :items="p.situations" v-slot="{ item, index }">
            <img :class="$style.img" :src="assetsUrl(item.thumbnailFile)" :alt="item.id" @click="selections[index] = !selections[index]"/>
            <div v-if="!selections[index]" :class="$style['img-cover']" @click="selections[index] = true"/>
            <CheckBox :class="$style.checkbox" v-model:value="selections[index]"/>
            <div v-if="item.hasParent" :class="$style['parent-flag']"><Icon icon="exclamation"/></div>
        </AspectGrid>
        <template #bottom>
            <div class="mt-2">
                <Button type="primary" icon="check-square" @click="selectAll">全选</Button>
                <Button class="ml-1" type="primary" icon="check-square-regular" @click="selectReverse">反选</Button>
                <span class="ml-2 is-line-height-std">已选择{{selectedCount}}项，共{{p.situations.length}}项</span>
                <span v-if="anyHasParent" class="ml-8 is-line-height-std is-font-size-small">
                    <Icon icon="exclamation"/>表示此图像已经属于另一个集合。
                </span>
                <Button class="float-right" mode="filled" type="primary" icon="check" :disabled="selectedCount < 0" @click="submit">确认</Button>
            </div>
        </template>
    </BottomLayout>
</template>

<style module lang="sass">
.img
    width: 100%
    height: 100%
    object-fit: cover
    object-position: center
    cursor: pointer

.img-cover
    position: absolute
    top: 0
    left: 0
    width: 100%
    height: 100%
    cursor: pointer
    background-color: rgba(128, 128, 128, 0.618)

.checkbox
    position: absolute
    right: 0.125rem
    bottom: 0.25rem

.parent-flag
    position: absolute
    left: 0
    top: 0
    border-top: 1rem solid blue
    border-right: 1rem solid transparent
</style>
