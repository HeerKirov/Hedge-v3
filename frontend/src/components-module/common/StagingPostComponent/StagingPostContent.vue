<script setup lang="ts">
import { BottomLayout, MiddleLayout } from "@/components/layout"
import { Separator, Button } from "@/components/universal"
import { StagingPostDataset } from "@/components-module/data"
import { DataRouter } from "@/components-business/top-bar"
import { useDataContext } from "./context"

const emit = defineEmits<{
    (e: "close"): void
}>()

const { listview: { listview, paginationData: { data, state, setState, navigateTo } }, isBrowserEnv, clear, openDetailView } = useDataContext(() => emit("close"))

</script>

<template>
    <BottomLayout>
        <template #top>
            <MiddleLayout class="px-1 mt-1 mb-1 is-element-height-std">
                <template #left>
                    <span class="is-font-size-large ml-2">暂存区</span>
                    <DataRouter v-if="state" :state="state" @navigate="navigateTo"/>
                </template>
                <template #right>
                    <Button class="mr-4" icon="trash" type="danger" :disabled="!state?.total" @click="clear">清空</Button>
                    <Button v-if="isBrowserEnv" icon="maximize" :disabled="!state" @click="openDetailView">详细</Button>
                </template>
            </MiddleLayout>
            <Separator direction="horizontal"/>
        </template>

        <div v-if="state && state.total <= 0" class="has-text-centered secondary-text">
            <i>暂存区为空</i>
        </div>
        <StagingPostDataset v-else view-mode="grid" fit-type="cover" :column-num="6" draggable
                            :data="data" :state="state" :query-instance="listview.proxy" @update:state="setState" @navigate="navigateTo"/>
    </BottomLayout>
</template>