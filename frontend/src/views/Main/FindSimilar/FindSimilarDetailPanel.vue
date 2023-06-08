<script setup lang="ts">
import { Button, Block, Icon } from "@/components/universal"
import { TopBarLayout, MiddleLayout, AspectGrid, BottomLayout } from "@/components/layout"
import { useAssets } from "@/functions/app"
import { installFindSimilarDetailPanel, useFindSimilarContext } from "@/services/main/find-similar"
import FindSimilarDetailPanelImageItem from "./FindSimilarDetailPanelImageItem.vue"
import CompareTable from "./CompareTable/CompareTable.vue"

const { paneState } = useFindSimilarContext()
const { 
    data, 
    selector: { selectMode, compare, multiple, exchangeCompareSelection, click }, 
    info: { selectedRelations } 
} = installFindSimilarDetailPanel()

const { assetsUrl } = useAssets()

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
                <Button class="w-100" icon="exchange-alt" @click="exchangeCompareSelection">交换A与B</Button>
                <label class="label mt-2 mb-1">已有关系</label>
                <template v-for="r in selectedRelations">
                    <p v-if="r.type === 'SOURCE_IDENTITY_EQUAL'" class="has-text-warning"><Icon icon="equals"/>来源一致</p>
                    <p v-else-if="r.type === 'SOURCE_IDENTITY_SIMILAR'" class="has-text-warning"><Icon icon="hand-lizard"/>来源项目一致但Part不同</p>
                    <p v-else-if="r.type === 'SOURCE_RELATED'" class="has-text-warning"><Icon icon="hand-scissors"/>来源项目有关联</p>
                    <p v-else-if="r.type === 'RELATION_MARK_SAME'" class="has-text-danger"><Icon icon="marker"/>来源关系标记：相同</p>
                    <p v-else-if="r.type === 'RELATION_MARK_SIMILAR'" class="has-text-danger"><Icon icon="lighlighter"/>来源关系标记：内容近似</p>
                    <p v-else-if="r.type === 'RELATION_MARK_RELATED'" class="has-text-danger"><Icon icon="joint"/>来源关系标记：关系接近</p>
                    <p v-else-if="r.type === 'HIGH_SIMILARITY'" class="has-text-success"><Icon icon="face-smile-beam"/>高相似度</p>
                    <p v-else-if="r.type === 'TOO_HIGH_SIMILARITY'" class="has-text-success"><Icon icon="face-laugh-beam"/>极高相似度</p>
                    <p v-else-if="r.type === 'EXISTED'" class="has-text-secondary"><Icon icon="check"/>已关联</p>
                </template>
                <label class="label mt-2 mb-1">已编辑的关系</label>
                <label class="label mt-2 mb-1">添加操作</label>
                <p><a><Icon icon="trash"/>删除项目A()</a></p>
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
