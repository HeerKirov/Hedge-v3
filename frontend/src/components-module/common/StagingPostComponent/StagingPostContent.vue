<script setup lang="ts">
import { BottomLayout, MiddleLayout } from "@/components/layout"
import { Separator, Button } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { StagingPostDataset } from "@/components-module/data"
import { DataRouter } from "@/components-business/top-bar"
import { MenuItem } from "@/modules/popup-menu"
import { useDataContext } from "./context"

const emit = defineEmits<{
    (e: "close"): void
}>()

const { listview: { listview, paginationData: { data, state, setState, navigateTo } }, isBrowserEnv, clear, createCollection, createBook, addToFolder, openDetailView } = useDataContext(() => emit("close"))

const ellipsisMenuItems = <MenuItem<undefined>[]>[
    {type: "normal", label: "创建为图像集合", click: createCollection},
    {type: "normal", label: "创建为新画集…", click: createBook},
    {type: "normal", label: "添加到目录…", click: addToFolder},
    {type: "separator"},
    {type: "normal", label: "清空暂存区", click: clear}
]

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
                    <Button v-if="isBrowserEnv" icon="maximize" :disabled="!state" @click="openDetailView">详细</Button>
                    <ElementPopupMenu :items="ellipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
                        <Button :ref="setEl" square icon="ellipsis-v" :disabled="!state" @click="popup"/>
                    </ElementPopupMenu>
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