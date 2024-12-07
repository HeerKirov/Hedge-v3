<script setup lang="ts">
import { Button, Separator } from "@/components/universal"
import { BrowserTeleport } from "@/components/logical"
import { PaneLayout } from "@/components/layout"
import { EmbedPreview } from "@/components-module/preview"
import { ColumnNumButton, FitTypeButton } from "@/components-business/top-bar"
import { installFindSimilarDetailPanel } from "@/services/main/find-similar"
import CompareTable from "./DetailPanel/CompareTable.vue"
import GraphView from "./DetailPanel/GraphView.vue"
import GridList from "./DetailPanel/GridList.vue"
import DetailPane from "./DetailPanel/FindSimilarDetailPane.vue"

const { data, viewMode, listviewController, operators: { complete } } = installFindSimilarDetailPanel()

</script>

<template>
    <BrowserTeleport to="top-bar">
        <template v-if="viewMode === 'grid'">
            <FitTypeButton class="mr-1" v-model:value="listviewController.fitType.value"/>
            <ColumnNumButton v-model:value="listviewController.columnNum.value"/>
            <Separator/>
        </template>
        <Button class="flex-item no-grow-shrink" :type="viewMode === 'grid' ? 'primary' : 'secondary'" square icon="border-all" @click="viewMode = 'grid'"/>
        <Button class="flex-item no-grow-shrink" :type="viewMode === 'graph' ? 'primary' : 'secondary'" square icon="diagram-project" @click="viewMode = 'graph'"/>
        <Button class="flex-item no-grow-shrink" :type="viewMode === 'compare' ? 'primary' : 'secondary'" square icon="table-columns" @click="viewMode = 'compare'"/>
        <Separator/>
        <Button class="flex-item no-grow-shrink" :type="data?.resolved ? 'success' : undefined" :mode="data?.resolved ? 'filled' : undefined" icon="check" @click="complete">完成</Button>
    </BrowserTeleport>

    <template v-if="data !== null">
        <PaneLayout :show-pane="viewMode === 'graph' || viewMode === 'grid'">
            <div v-if="viewMode === 'graph' || viewMode === 'compare'" :class="viewMode === 'graph' ? $style['grid-mode'] : $style['compare-mode']">
                <CompareTable v-if="viewMode === 'compare'"/>
                <Separator :class="$style.separator" direction="horizontal" :spacing="0"/>
                <GraphView/>
            </div>
            <GridList v-else/>
            <EmbedPreview/>
            <template #pane>
                <DetailPane/>
            </template>
        </PaneLayout>
    </template>
</template>

<style module lang="sass">
.compare-mode
    position: relative
    width: 100%
    height: 100%
    > div:first-child
        position: absolute
        top: 0
        left: 0
        right: 0
        height: 55%
    > .separator
        position: absolute
        top: 55%
    > div:last-child
        position: absolute !important
        bottom: 0
        left: 0
        right: 0
        height: 45%

.grid-mode
    width: 100%
    height: 100%
    > div
        width: 100%
        height: 100%
</style>
