<script setup lang="ts">
import { Button, Block } from "@/components/universal"
import { Input, CheckBox } from "@/components/form"
import { VirtualGridView } from "@/components/data"
import { AspectGrid, BottomLayout, Flex, FlexItem } from "@/components/layout"
import { DataRouter } from "@/components-business/top-bar"
import { ExportSituationImage } from "@/functions/http-client/api/util-export"
import { useAssets } from "@/functions/app"
import { ExternalExporterProps, useExporterData } from "./context"
import { startDragFile } from "@/modules/others"

const props = defineProps<{
    p: ExternalExporterProps
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const { assetsUrl, assetsLocal } = useAssets()

const { packageMode, packageName, externalLocation, preview, executing, openDialog, executeExport } = useExporterData(props.p, () => emit("close"))

const onDragstart = async (e: DragEvent, item: ExportSituationImage) => {
    e.preventDefault()
    startDragFile(await assetsLocal(item.filePath.sample), await assetsLocal(item.filePath.original))
}

</script>

<template>
    <Flex class="ml-1 h-100" :spacing="2">
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
                
                <template #bottom>
                    <Button class="mt-2 w-100" mode="filled" type="primary" icon="external-link-alt" :disabled="executing" @click="executeExport">导出</Button>
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
            <div v-else-if="preview.type === 'BOOK'" class="p-2">
                <Block v-if="preview.book.value !== undefined" class="p-2">
                    <Flex :spacing="2" align="center">
                        <FlexItem v-if="preview.book.value.filePath !== null" :shrink="0" :grow="0">
                            <img :class="$style['book-cover']" :src="assetsUrl(preview.book.value.filePath.sample)"/>
                        </FlexItem>
                        <FlexItem :width="100">
                            <div class="is-font-size-large">{{ preview.book.value.title }}</div>
                        </FlexItem>
                        <FlexItem>
                            <DataRouter/>
                        </FlexItem>
                    </Flex>
                </Block>
                <VirtualGridView :column-count="7" :buffer-size="3" :min-update-delta="1"
                                 v-bind="preview.paginationData.data.metrics" @update="preview.paginationData.dataUpdate">
                    <div v-for="item in preview.paginationData.data.result" :class="$style['book-image']">
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
@import "../../../styles/base/size"

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
        border-radius: $radius-size-std

.book-cover
    width: $element-height-std
    height: $element-height-std
    object-position: center
    object-fit: cover
    border-radius: $radius-size-std
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
            border-radius: $radius-size-std
</style>