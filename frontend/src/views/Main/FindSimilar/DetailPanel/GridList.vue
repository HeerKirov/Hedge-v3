<script setup lang="ts">
import { IllustImageDataset } from "@/components-module/data"
import { useGridList } from "@/services/main/find-similar"

const { paginationData, selector: { selected, lastSelected, update: updateSelect }, listviewController: { viewMode, fitType, columnNum } } = useGridList()

</script>

<template>
    <IllustImageDataset :data="paginationData.data" :query-instance="paginationData.proxy"
                        view-mode="grid" :fit-type="fitType" :column-num="columnNum"
                        :selected="selected" :last-selected="lastSelected" @select="updateSelect"
                        @data-update="paginationData.dataUpdate"/>
</template>
