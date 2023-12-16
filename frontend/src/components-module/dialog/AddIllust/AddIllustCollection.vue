<script setup lang="ts">
import { Button, Icon, Block } from "@/components/universal"
import { BottomLayout } from "@/components/layout"
import { CheckBox } from "@/components/form"
import { useAssets } from "@/functions/app"
import { date } from "@/utils/datetime"
import { CaseCollectionProps, useAddIllustCollectionContext } from "./context"

const props = defineProps<{
    p: CaseCollectionProps
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const { assetsUrl } = useAssets()

const { situations, collectionTotalCount, selectedCollections, selectedPartition, forbiddenExistCheck, submit } = useAddIllustCollectionContext(props.p, () => emit("close"))

</script>

<template>
    <BottomLayout>
        <p class="mt-2 pl-1 is-font-size-large">添加图像到集合</p>
        <p class="mb-2 pl-1">{{ situations.length > 1 ? '即将加入的图像与集合分属不同的时间分区' : '' }}{{ situations.length > 1 && collectionTotalCount > 1 && !forbiddenExistCheck ? '，且' : '' }}{{ collectionTotalCount > 1 && !forbiddenExistCheck ? '部分图像已存在于其他集合' : '' }}。请确认处理策略：</p>
        <template v-if="situations.length > 1">
            <Block v-for="s in situations" :key="s.partitionTime!.timestamp" :class="$style.item" :color="selectedPartition === s.partitionTime!.timestamp ? 'primary' : undefined" @click="selectedPartition = s.partitionTime!.timestamp">
                <div :class="$style['partition-head']">
                    {{ date.toISOString(s.partitionTime!) }}
                    <p class="mt-1 is-font-size-small">包含{{ s.totalImageCount }}项</p>
                </div>
                <div :class="$style['partition-content']">
                    <Block v-if="s.collections.length > 0" v-for="c in s.collections" :class="$style['collection-item']" :color="p.collectionId === c.collectionId ? 'warning' : selectedCollections[c.collectionId] !== false ? 'primary' : undefined">
                        <CheckBox v-if="!forbiddenExistCheck && p.collectionId !== c.collectionId" :class="$style.check" :value="selectedCollections[c.collectionId] !== false" @update:value="selectedCollections[c.collectionId] = $event" @click.stop/>
                        <img :class="$style.img" :src="assetsUrl(c.childrenExamples[0].filePath.sample)" :alt="`collection ${c.collectionId}`" @click.stop="selectedCollections[c.collectionId] = !selectedCollections[c.collectionId]"/>
                        <p><Icon class="mr-2" icon="id-card"/><b class="can-be-selected">{{ c.collectionId }}</b></p>
                        <p class="secondary-text">共{{ c.childrenCount }}项</p>
                    </Block>
                    <div v-else v-for="i in s.images" :class="$style['image-item']">
                        <img :class="$style.img" :src="assetsUrl(i.filePath.sample)" :alt="`image ${i.id}`"/>
                    </div>
                </div>
            </Block>
        </template>
        <div v-else :class="$style['collection-list']">
            <template v-for="c in p.situations[0].collections">
                <Block v-if="c.collectionId !== p.collectionId" :key="c.collectionId" :class="$style['collection-item']" :color="p.collectionId === c.collectionId ? 'warning' : selectedCollections[c.collectionId] !== false ? 'primary' : undefined">
                    <CheckBox v-if="p.collectionId !== c.collectionId" :class="$style.check" :value="selectedCollections[c.collectionId] !== false" @update:value="selectedCollections[c.collectionId] = $event" @click.stop/>
                    <img :class="$style.img" :src="assetsUrl(c.childrenExamples[0].filePath.sample)" :alt="`collection ${c.collectionId}`" @click.stop="selectedCollections[c.collectionId] = !selectedCollections[c.collectionId]"/>
                    <p><Icon class="mr-2" icon="id-card"/><b class="can-be-selected">{{ c.collectionId }}</b></p>
                    <p class="secondary-text">共{{ c.childrenCount }}项</p>
                </Block>
            </template>
        </div>
        <template #bottom>
            <div class="mt-2">
                <span class="ml-2 is-line-height-std">{{ situations.length > 1 ? '选择一个时间分区以决定要将图像聚集到哪个分区' : '' }}{{ situations.length > 1 && collectionTotalCount > 1 && !forbiddenExistCheck ? '；' : '' }}{{ collectionTotalCount > 1 && !forbiddenExistCheck ? '取消勾选集合以将属于某集合的图像从添加列表里排除' : '' }}。</span>
                <Button class="float-right ml-1" mode="filled" type="primary" icon="check" @click="submit">确认</Button>
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

.collection-list
    width: 100%
    padding: 0 0.5rem
    display: flex
    flex-wrap: wrap
    gap: 0.25rem

.collection-item
    position: relative
    display: inline-block
    padding: 0.25rem
    text-align: center
    > .check
        position: absolute
        left: 0.25rem
        top: 0.25rem
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
