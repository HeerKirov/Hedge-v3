<script setup lang="ts">
import { Button } from "@/components/universal"
import { TopBarLayout, MiddleLayout } from "@/components/layout"
import { ElementPopupMenu } from "@/components/interaction"
import { VirtualRowView } from "@/components/data"
import { DataRouter } from "@/components-business/top-bar"
import { useFindSimilarContext } from "@/services/main/find-similar"
import FindSimilarListPanelItem from "./FindSimilarListPanelItem.vue"

const { listview: { paginationData }, paneState } = useFindSimilarContext()

</script>

<template>
    <TopBarLayout>
        <template #top-bar>
            <MiddleLayout>
                <template #right>
                    <DataRouter/>
                    <ElementPopupMenu :items="[]" position="bottom" align="left" v-slot="{ popup, setEl }">
                        <Button :ref="setEl" expose-el square icon="ellipsis-v" @click="popup"/>
                    </ElementPopupMenu>
                </template>
            </MiddleLayout>
        </template>

        <VirtualRowView :row-height="80" :padding="6" :buffer-size="8" v-bind="paginationData.data.metrics" @update="paginationData.dataUpdate">
            <FindSimilarListPanelItem v-for="item in paginationData.data.result" :key="item.id"
                                      :item="item" @click="paneState.openDetailView(item.id)"/>
        </VirtualRowView>
    </TopBarLayout>
</template>

<style module lang="sass">

</style>
