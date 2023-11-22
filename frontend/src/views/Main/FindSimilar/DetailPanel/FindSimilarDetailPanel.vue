<script setup lang="ts">
import { Button, Separator } from "@/components/universal"
import { TopBarLayout, MiddleLayout, PaneLayout } from "@/components/layout"
import { ColumnNumButton, FitTypeButton } from "@/components-business/top-bar"
import { installFindSimilarDetailPanel, useFindSimilarContext } from "@/services/main/find-similar"
import CompareTable from "./CompareTable.vue"
import GraphView from "./GraphView.vue"
import GridList from "./GridList.vue"
import DetailPane from "./DetailPane.vue"

const { paneState } = useFindSimilarContext()
const { data, viewMode, listviewController, operators: { complete } } = installFindSimilarDetailPanel()

</script>

<template>
    <TopBarLayout>
        <template #top-bar>
            <MiddleLayout>
                <template #left>
                    <Button square icon="angle-left" @click="paneState.closeView()"/>
                    <span class="ml-2 is-font-size-large">{{viewMode === "graph" ? "相似关系图" : viewMode === "grid" ? "相似项列表" : "相似项对比"}}</span>
                </template>
                <template #right>
                    <template v-if="viewMode === 'grid' || viewMode === 'compare'">
                        <FitTypeButton class="mr-1" v-model:value="listviewController.fitType.value"/>
                        <ColumnNumButton v-model:value="listviewController.columnNum.value"/>
                        <Separator/>
                    </template>
                    <Button :type="viewMode === 'grid' ? 'primary' : 'secondary'" square icon="border-all" @click="viewMode = 'grid'"/>
                    <Button :type="viewMode === 'graph' ? 'primary' : 'secondary'" square icon="diagram-project" @click="viewMode = 'graph'"/>
                    <Button :type="viewMode === 'compare' ? 'primary' : 'secondary'" square icon="table-columns" @click="viewMode = 'compare'"/>
                    <Separator/>
                    <Button :type="data?.resolved ? 'success' : undefined" :mode="data?.resolved ? 'filled' : undefined" icon="check" @click="complete">完成</Button>
                </template>
            </MiddleLayout>
        </template>
        <template v-if="data !== null">
            <PaneLayout :show-pane="viewMode === 'graph' || viewMode === 'grid'">
                <div v-if="viewMode === 'graph' || viewMode === 'compare'" :class="viewMode === 'graph' ? $style['grid-mode'] : $style['compare-mode']">
                    <CompareTable v-if="viewMode === 'compare'"/>
                    <GraphView/>
                </div>
                <GridList v-else/>
                <template #pane>
                    <DetailPane/>
                </template>
            </PaneLayout>
        </template>
    </TopBarLayout>
</template>

<style module lang="sass">
@import "../../../../styles/base/size"

.compare-mode
    position: relative
    width: 100%
    height: 100%
    > div:first-child
        position: absolute
        top: 0
        left: 0
        right: 0
        height: 65%
    > div:last-child
        position: absolute !important
        bottom: 0
        left: 0
        right: 0
        height: 35%

.grid-mode
    width: 100%
    height: 100%
    > div
        width: 100%
        height: 100%

</style>
