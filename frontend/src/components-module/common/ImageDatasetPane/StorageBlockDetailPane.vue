<script setup lang="ts">
import { BasePane, Flex } from "@/components/layout"
import { Icon, Separator, Button } from "@/components/universal"
import { useBlockDetailPane } from "@/services/main/file-storage"
import { numbers } from "@/utils/primitives"
import { datetime } from "@/utils/datetime"

defineEmits<{
    (e: "close"): void
    (e: "open-block", block: string): void
}>()

const { data, loading, selector: { selected } } = useBlockDetailPane()

const sizeLabel = (n: number) => numbers.toBytesDisplay(n)

</script>

<template>
    <BasePane @close="$emit('close')">
        <template #title>
            <p class="mt-2 ml-2">
                <span v-if="selected.length > 1" class="has-bg-background-color">已选择<b>{{ selected.length }}</b>项</span>
                <i v-else-if="selected.length <= 0" class="has-text-secondary">未选择任何项</i>
            </p>
        </template>
        <template v-if="loading && !data">
            <p class="secondary-text my-2 ml-2">加载中…</p>
        </template>
        <template v-else-if="!!data">
            <p class="selectable word-wrap-anywhere my-1"><b>区块 {{ data.name }}</b></p>
            <p class="secondary-text">文件数 {{ data.fileCount }} 项</p>
            <p class="secondary-text">合计大小 {{ sizeLabel(data.totalSize) }}</p>
            <p class="secondary-text">最后修改 {{ datetime.toSimpleFormat(data.lastModified) }}</p>
            <Separator direction="horizontal"/>
            <div class="mt-2">
                <p class="secondary-text is-font-size-small mb-1">属性</p>
                <Flex horizontal="stretch" align="center" class="py-half">
                    <span class="secondary-text">含压缩包</span>
                    <span>
                        <Icon v-if="data.hasZipFile" icon="archive" class="has-text-success"/>
                        <span v-else class="secondary-text">否</span>
                    </span>
                </Flex>
                <Flex horizontal="stretch" align="center" class="py-half">
                    <span class="secondary-text">含子目录</span>
                    <span>
                        <Icon v-if="data.hasDirectory" icon="folder-open" class="has-text-success"/>
                        <span v-else class="secondary-text">否</span>
                    </span>
                </Flex>
            </div>
            <Button class="mt-2 w-100" type="primary" mode="light" size="small" icon="folder-open" @click="$emit('open-block', data.name)">
                打开此块
            </Button>
        </template>
    </BasePane>
</template>

<style module lang="sass">
@use "@/styles/base/color"

.top-folder
    aspect-ratio: 1
    width: 100%
    max-height: 12rem
    margin: 0 auto
    display: flex
    align-items: center
    justify-content: center
    border-radius: 4px
    @media (prefers-color-scheme: light)
        background-color: rgba(color.$light-mode-text-color, 0.06)
    @media (prefers-color-scheme: dark)
        background-color: rgba(color.$dark-mode-text-color, 0.08)

.top-folder-muted
    opacity: 0.45
</style>
