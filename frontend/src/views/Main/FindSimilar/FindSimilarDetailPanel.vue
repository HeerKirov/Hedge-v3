<script setup lang="ts">
import { computed } from "vue"
import { Button, Block } from "@/components/universal"
import { ImageCompareTable } from "@/components-module/data"
import { TopBarLayout, MiddleLayout, AspectGrid } from "@/components/layout"
import { useAssets } from "@/functions/app"
import { installFindSimilarDetailPanel, useFindSimilarContext } from "@/services/main/find-similar"
import FindSimilarDetailPanelImageItem from "./FindSimilarDetailPanelImageItem.vue"

const { paneState } = useFindSimilarContext()
const { data, selector } = installFindSimilarDetailPanel()

const { assetsUrl } = useAssets()

const IMAGE_COMPARE_TITLES = ["A", "B"]

const ids = computed(() => [selector.singleSelected.value.a, selector.singleSelected.value.b])

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
            <ImageCompareTable :titles="IMAGE_COMPARE_TITLES" :ids="ids"/>
        </Block>
        <Block :class="$style['action-area']">

        </Block>
        <Block :class="$style.images">
            <AspectGrid v-if="data !== null" class="p-2" :items="data.images" :column-num="9" :spacing="1" v-slot="{ item, index }">
                <FindSimilarDetailPanelImageItem :item="item" @click="selector.click(index, $event)"/>
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

.images
    position: absolute
    bottom: $spacing
    left: $spacing
    right: $spacing
    height: calc(40% - $spacing * 3)
    overflow-y: auto
</style>
