<script setup lang="ts">
import { Button, Block } from "@/components/universal"
import { TopBarLayout, MiddleLayout, AspectGrid, BottomLayout } from "@/components/layout"
import { installFindSimilarDetailPanel, useFindSimilarContext } from "@/services/main/find-similar"
import FindSimilarDetailPanelImageItem from "./FindSimilarDetailPanelImageItem.vue"
import InfoDisplay from "./InfoDisplay/InfoDisplay.vue"
import CompareTable from "./CompareTable/CompareTable.vue"

const { paneState } = useFindSimilarContext()
const { 
    data, 
    selector: { selectMode, compare, multiple, click }
} = installFindSimilarDetailPanel()

</script>

<template>
    <TopBarLayout>
        <template #top-bar>
            <MiddleLayout>
                <template #left>
                    <Button square icon="angle-left" @click="paneState.closeView()"/>
                </template>
            </MiddleLayout>
        </template>
        <Block :class="$style['compare-table']">
            <CompareTable v-if="selectMode === 'COMPARE'" :item-a="compare.a !== null ? compare.a : compare.b" :item-b="compare.a !== null ? compare.b : null"/>
            <CompareTable v-else :item-a="multiple.lastSelected" :item-b="null"/>
        </Block>
        <Block :class="$style['action-area']">
            <BottomLayout>
                <InfoDisplay/>
                <template #bottom>
                    <Button class="w-100" mode="light" type="success" icon="check">完成处理</Button>
                </template>
            </BottomLayout>
        </Block>
        <Block :class="$style.images">
            <AspectGrid v-if="data !== null" class="p-2" :items="data.images" :column-num="9" :spacing="1" v-slot="{ item, index }">
                <FindSimilarDetailPanelImageItem :item="item" @click="click(index, $event)"/>
            </AspectGrid>
        </Block>
    </TopBarLayout>
</template>

<style module lang="sass">
@import "../../../styles/base/size"

$spacing: 0.75rem
$action-width: 25%

.compare-table
    position: absolute
    left: $spacing
    top: $spacing
    height: 60%
    width: calc(100% - $action-width - $spacing * 3)
    overflow-y: auto

.action-area
    position: absolute
    right: $spacing
    top: $spacing
    height: 60%
    width: $action-width
    padding: 0.25rem

.images
    position: absolute
    bottom: $spacing
    left: $spacing
    right: $spacing
    height: calc(40% - $spacing * 3)
    overflow-y: auto
</style>
