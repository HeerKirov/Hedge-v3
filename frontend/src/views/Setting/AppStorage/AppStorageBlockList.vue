<script setup lang="ts">
import { PaneLayout } from "@/components/layout"
import { StorageBlockDetailPane } from "@/components-module/common"
import { StorageBlockDataset } from "@/components-module/data"
import { installBlockListContext } from "@/services/main/file-storage"

const {
    listview: { listview, paginationData },
    selector: { selected, selectedIndex, lastSelected, update: updateSelect },
} = installBlockListContext()

const emit = defineEmits<{
    (e: "open-block", block: string): void
}>()

const openBlock = (blockId: number) => {
    const index = listview.proxy.sync.findByKey(blockId)
    if(index !== undefined) {
        const block = listview.proxy.sync.retrieve(index)!
        emit("open-block", block.name)
    }
}
</script>

<template>
    <PaneLayout scope-name="file-storage-block" show-pane>
        <StorageBlockDataset :data="paginationData.data.value" :state="paginationData.state.value" :query-instance="listview.proxy"
                            :selected="selected" :selected-index="selectedIndex" :last-selected="lastSelected" :selected-count-badge="false"
                            @update:state="paginationData.setState" @navigate="paginationData.navigateTo" @select="updateSelect" 
                            @dblclick="openBlock" @enter="openBlock"/>
        <template #pane>
            <StorageBlockDetailPane @open-block="$emit('open-block', $event)"/>
        </template>
    </PaneLayout>
</template>