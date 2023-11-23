<script setup lang="ts">
import { Button, Icon } from "@/components/universal"
import { TopBarLayout, MiddleLayout } from "@/components/layout"
import { ElementPopupMenu } from "@/components/interaction"
import { VirtualRowView } from "@/components/data"
import { DataRouter } from "@/components-business/top-bar"
import { useDialogService } from "@/components-module/dialog"
import { MenuItem } from "@/modules/popup-menu"
import { useFindSimilarContext } from "@/services/main/find-similar"
import FindSimilarListPanelItem from "./FindSimilarListPanelItem.vue"

const { listview: { paginationData }, paneState } = useFindSimilarContext()

const { findSimilarTaskExplorer } = useDialogService()

const ellipsisMenu = <MenuItem<undefined>[]>[
    {type: "normal", label: "查找任务队列", click: findSimilarTaskExplorer.list},
    {type: "separator"},
    {type: "normal", label: "手动新建查找任务", click: findSimilarTaskExplorer.create}
]

</script>

<template>
    <TopBarLayout>
        <template #top-bar>
            <MiddleLayout>
                <template #right>
                    <DataRouter/>
                    <ElementPopupMenu :items="ellipsisMenu" position="bottom" align="left" v-slot="{ popup, setEl }">
                        <Button :ref="setEl" square icon="ellipsis-v" @click="popup"/>
                    </ElementPopupMenu>
                </template>
            </MiddleLayout>
        </template>

        <div v-if="paginationData.data.metrics.total !== undefined && paginationData.data.metrics.total <= 0" class="h-100 has-text-centered">
                <p class="secondary-text"><i>未发现任何查找结果</i></p>
                <p class="mt-2 secondary-text">
                    <a @click="findSimilarTaskExplorer.create()"><Icon icon="plus"/>手动新建查找任务</a>
                    或
                    <a @click="findSimilarTaskExplorer.list()"><Icon icon="list"/>查看查找任务队列</a>
                </p>
            </div>
        <VirtualRowView v-else :row-height="90" :padding="6" :buffer-size="8" v-bind="paginationData.data.metrics" @update="paginationData.dataUpdate">
            <FindSimilarListPanelItem v-for="item in paginationData.data.result" :key="item.id" :item="item" @click="paneState.openDetailView(item.id)"/>
        </VirtualRowView>
    </TopBarLayout>
</template>
