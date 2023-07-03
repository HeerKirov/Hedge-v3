<script setup lang="ts">
import { BottomLayout } from "@/components/layout"
import { Separator, Button } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { StagingPostDataset } from "@/components-module/data"
import { MenuItem } from "@/modules/popup-menu"
import { useDataContext } from "./context"

const emit = defineEmits<{
    (e: "close"): void
}>()

const { listview: { paginationData }, clear, createCollection, createBook, addToFolder, openDetailView } = useDataContext(() => emit("close"))

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
            <div class="is-line-height-std px-1 pt-1 mb-mhalf">
                <span class="is-font-size-large ml-2">暂存区</span>
                <div class="float-right">
                    <ElementPopupMenu :items="ellipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
                        <Button :ref="setEl" icon="ellipsis-v" :disabled="!paginationData.data.metrics.total" @click="popup">更多操作</Button>
                    </ElementPopupMenu>
                    <Button icon="maximize" :disabled="!paginationData.data.metrics.total" @click="openDetailView">详细</Button>
                </div>
            </div>
            <Separator direction="horizontal"/>
        </template>

        <div v-if="paginationData.data.metrics.total !== undefined && paginationData.data.metrics.total <= 0" class="has-text-centered secondary-text">
            <i>暂存区为空</i>
        </div>
        <StagingPostDataset v-else view-mode="grid" fit-type="cover" :column-num="6"
                            :data="paginationData.data" :query-instance="paginationData.proxy"
                            @data-update="paginationData.dataUpdate"/>
    </BottomLayout>
</template>