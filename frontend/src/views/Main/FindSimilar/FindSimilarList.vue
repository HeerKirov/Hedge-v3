<script setup lang="ts">
import { Button, Icon } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { VirtualRowView } from "@/components/data"
import { BrowserTeleport } from "@/components/logical"
import { DataRouter } from "@/components-business/top-bar"
import { useDialogService } from "@/components-module/dialog"
import { MenuItem } from "@/modules/popup-menu"
import { useFindSimilarContext } from "@/services/main/find-similar"
import FindSimilarListItem from "./FindSimilarListItem.vue"

const { listview: { paginationData: { data, state, setState, navigateTo } }, openDetailView } = useFindSimilarContext()

const { findSimilarTaskExplorer } = useDialogService()

const ellipsisMenu = <MenuItem<undefined>[]>[
    {type: "normal", label: "查找任务队列", click: findSimilarTaskExplorer.list},
    {type: "separator"},
    {type: "normal", label: "手动新建查找任务", click: findSimilarTaskExplorer.create}
]

</script>

<template>
    <BrowserTeleport to="top-bar">
        <DataRouter :state="state" @navigate="navigateTo"/>
        <ElementPopupMenu :items="ellipsisMenu" position="bottom" align="left" v-slot="{ popup, setEl }">
            <Button :ref="setEl" class="flex-item no-grow-shrink" square icon="ellipsis-v" @click="popup"/>
        </ElementPopupMenu>
    </BrowserTeleport>

    <div v-if="state !== null && state.total <= 0" class="h-100 has-text-centered">
        <p class="secondary-text"><i>未发现任何查找结果</i></p>
        <p class="mt-2 secondary-text">
            <a @click="findSimilarTaskExplorer.create()"><Icon icon="plus"/>手动新建查找任务</a>
            或
            <a @click="findSimilarTaskExplorer.list()"><Icon icon="list"/>查看查找任务队列</a>
        </p>
    </div>
    <VirtualRowView v-else :row-height="90" :padding="6" :buffer-size="8" :metrics="data.metrics" :state="state" @update:state="setState">
        <FindSimilarListItem v-for="item in data.items" :key="item.id" :item="item" @click="openDetailView(item.id)"/>
    </VirtualRowView>
</template>
