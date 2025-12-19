<script setup lang="ts">
import { Button, Block } from "@/components/universal"
import { Input, CheckBox, Select } from "@/components/form"
import { VirtualGridView } from "@/components/data"
import { AspectGrid, BottomLayout, Flex, FlexItem } from "@/components/layout"
import { DataRouter } from "@/components-business/top-bar"
import { useAssets } from "@/functions/app"
import { SimpleIllust } from "@/functions/http-client/api/illust"
import { startDragFile } from "@/modules/others"
import { ExternalExporterProps, useExporterData } from "./context"

const props = defineProps<{
    p: ExternalExporterProps
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const { assetsUrl, assetsLocal } = useAssets()

const { packageMode, packageName, externalLocation, nameType, preview, executing, openDialog, executeExport } = useExporterData(props.p, () => emit("close"))

const onDragstart = async (e: DragEvent, item: SimpleIllust) => {
    e.preventDefault()
    startDragFile(await assetsLocal(item.filePath.sample), await assetsLocal(item.filePath.original))
}

const NAME_TYPE_OPTION_ITEMS = [
    {label: "原始文件名", value: "ORIGINAL_FILENAME"},
    {label: "来源数据", value: "SOURCE"},
    {label: "ID", value: "ID"},
] as const

</script>

<template>
    <Flex :class="$style.root" :spacing="2">
        <FlexItem :width="20">
            <BottomLayout>
                <p class="mt-2 is-font-size-large">导出</p>
                <label class="mt-4 label">导出位置</label>
                <Flex :spacing="1">
                    <FlexItem :width="100">
                        <Input size="small" v-model:value="externalLocation"/>
                    </FlexItem>
                    <FlexItem :grow="0" :shrink="0">
                        <Button square size="small" mode="filled" type="primary" icon="folder-open" @click="openDialog"/>
                    </FlexItem>
                </Flex>
                <template v-if="preview.packagable.value">
                    <CheckBox class="mt-2" v-model:value="packageMode">打包导出</CheckBox>
                    <template v-if="packageMode">
                        <label class="mt-1 label">打包文件名(.zip)</label>
                        <Input width="fullwidth" size="small" v-model:value="packageName"/>
                    </template>
                </template>
                <label class="mt-1 label">文件名类型</label>
                <Select width="fullwidth" size="small" :items="NAME_TYPE_OPTION_ITEMS" v-model:value="nameType"/>
                <template #bottom>
                    <Button class="mt-2 w-100" mode="filled" type="primary" :icon="executing ? 'circle-notch' : 'external-link-alt'" :icon-spin="executing" :disabled="executing" @click="executeExport">导出</Button>
                </template>
            </BottomLayout>
        </FlexItem>
        <FlexItem :width="80">
            <div v-if="preview.type === 'ILLUST' && preview.images.value.length === 1" :class="$style['single-image']">
                <img :src="assetsUrl(preview.images.value[0].filePath.thumbnail)" @dragstart="onDragstart($event, preview.images.value[0])"/>
            </div>
            <div v-else-if="preview.type === 'ILLUST' && preview.images.value.length <= 7" class="p-2">
                <AspectGrid :class="$style['single-line']" :column-num="preview.images.value.length" :spacing="1" :items="preview.images.value" v-slot="{ item }">
                    <img :src="assetsUrl(item.filePath.thumbnail)" :alt="`${item.id}`" @dragstart="onDragstart($event, item)"/>
                </AspectGrid>
            </div>
            <div v-else-if="preview.type === 'ILLUST'" class="is-overflow-y-auto p-2">
                <AspectGrid :column-num="7" :spacing="1" :items="preview.images.value" v-slot="{ item }">
                    <img :src="assetsUrl(item.filePath.sample)" :alt="`${item.id}`" @dragstart="onDragstart($event, item)"/>
                </AspectGrid>
            </div>
            <div v-else-if="preview.type === 'BOOK'" class="p-2 flex column">
                <Block v-if="preview.book.value !== undefined" class="p-2">
                    <Flex :spacing="2" align="center">
                        <FlexItem v-if="preview.book.value.filePath !== null" :shrink="0" :grow="0">
                            <img :class="$style['book-cover']" :src="assetsUrl(preview.book.value.filePath.sample)"/>
                        </FlexItem>
                        <FlexItem :width="100">
                            <div class="is-font-size-large">{{ preview.book.value.title }}</div>
                        </FlexItem>
                        <FlexItem>
                            <DataRouter :state="preview.paginationData.state.value" @navigate="preview.paginationData.navigateTo($event)"/>
                        </FlexItem>
                    </Flex>
                </Block>
                <VirtualGridView :column-count="7" :metrics="preview.paginationData.data.value.metrics" :state="preview.paginationData.state.value" @update:state="preview.paginationData.setState">
                    <div v-for="item in preview.paginationData.data.value.items" :key="item.id" :class="$style['book-image']">
                        <div :class="$style.content">
                            <img :src="assetsUrl(item.filePath.sample)" @dragstart="onDragstart($event, item)"/>
                        </div>
                    </div>
                </VirtualGridView>
            </div>
        </FlexItem>
    </Flex>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.root
    height: 50vh

.single-line
    height: 100%
    align-items: center

.single-image
    display: flex
    justify-content: center
    align-items: center
    > img
        max-height: 100%
        max-width: 100%
        border-radius: size.$radius-size-std

.book-cover
    width: size.$element-height-std
    height: size.$element-height-std
    object-position: center
    object-fit: cover
    border-radius: size.$radius-size-std
.book-image
    position: relative
    height: 0
    width: calc(100% / 7)
    padding: calc(50% / 7) 0
    > .content
        position: absolute
        top: 2px
        bottom: 2px
        left: 2px
        right: 2px
        > img
            height: 100%
            width: 100%
            object-position: center
            object-fit: cover
            border-radius: size.$radius-size-std
</style>