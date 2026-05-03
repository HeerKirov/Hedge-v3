<script setup lang="ts">
import { computed } from "vue"
import { BasePane, Flex } from "@/components/layout"
import { Icon, Separator, ThumbnailImage } from "@/components/universal"
import { FileInfoDisplay } from "@/components-business/form-display"
import { useFileDetailPane } from "@/services/main/file-storage"
import { datetime } from "@/utils/datetime"

defineEmits<{
    (e: "close"): void
}>()

const { data, loading, selector: { selected } } = useFileDetailPane()

const previewFile = computed(() => data.value?.filepath.thumbnail ?? data.value?.filepath.sample ?? null)

</script>

<template>
    <BasePane @close="$emit('close')">
        <template #title>
            <p class="mt-2 ml-2">
                <span v-if="selected.length > 1" class="has-bg-background-color">已选择<b>{{ selected.length }}</b>项</span>
                <i v-else-if="selected.length <= 0" class="has-text-secondary">未选择任何项</i>
            </p>
        </template>
        <template #top>
            <ThumbnailImage class="is-cursor-zoom-in" :aspect="1" :file="previewFile"
                            :draggable-file="data?.filepath.original ?? null" :drag-icon-file="data?.filepath.sample ?? data?.filepath.thumbnail ?? null"
                            :original-filename="data?.fileName ?? null"/>
        </template>

        <template v-if="loading && !data">
            <p class="secondary-text my-2 ml-2">加载中…</p>
        </template>
        <template v-else-if="!!data">
            <p class="selectable word-wrap-anywhere my-1"><b>{{ data.fileName }}</b></p>
            <Separator direction="horizontal"/>
            <FileInfoDisplay class="mt-2" :extension="data.extension.toLowerCase()" :file-size="data.size" :resolution-width="data.resolutionWidth" :resolution-height="data.resolutionHeight"/>
            <p class="secondary-text mt-2">创建时间 {{ datetime.toSimpleFormat(data.createTime) }}</p>
            <div class="mt-2">
                <Flex horizontal="stretch" align="center" class="py-half">
                    <span class="secondary-text">已生成Thumbnail</span>
                    <span><Icon v-if="data.hasThumbnail" icon="check" class="has-text-success"/><Icon v-else icon="times" class="has-text-secondary"/></span>
                </Flex>
                <Flex horizontal="stretch" align="center" class="py-half">
                    <span class="secondary-text">已生成Sample</span>
                    <span><Icon v-if="data.hasSample" icon="check" class="has-text-success"/><Icon v-else icon="times" class="has-text-secondary"/></span>
                </Flex>
                <Flex v-if="data.inBlockDirectory" horizontal="stretch" align="center" class="py-half">
                    <span class="secondary-text">未被打包归档</span>
                    <span><Icon icon="folder-open" class="has-text-warning"/></span>
                </Flex>
            </div>
        </template>
    </BasePane>
</template>
