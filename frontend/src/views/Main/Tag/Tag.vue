<script setup lang="ts">
import { Button, Block, Separator } from "@/components/universal"
import { PaneLayout, BasePane } from "@/components/layout"
import { BrowserTeleport } from "@/components/logical"
import { SearchBox, SearchResultInfo, LockOnButton } from "@/components-business/top-bar"
import { TagTree } from "@/components-module/data"
import { TagTreeNode } from "@/functions/http-client/api/tag"
import { installTagContext } from "@/services/main/tag"
import TagCreatePane from "./TagCreatePane.vue"
import TagDetailPane from "./TagDetailPane.vue"

const {
    paneState,
    editableLockOn,
    operators,
    listview: { loading, data },
    search: { searchText, searchInfo, tagTreeRef, next, prev }
} = installTagContext()

const onClick = (tag: TagTreeNode) => paneState.openDetailView(tag.id)

const onMove = (tag: TagTreeNode, parent: number | null | undefined, ordinal: number) => operators.moveItem(tag.id, parent, ordinal)

const onCreate = (parent: number | null, ordinal: number) => operators.createByOrdinal(parent, ordinal)

const onDelete = (tag: TagTreeNode) => operators.deleteItem(tag.id)

</script>

<template>
    <BrowserTeleport to="top-bar">
        <SearchBox placeholder="在此处搜索" v-model:value="searchText" @enter="nv => { if(!nv) next() }"/>
        <SearchResultInfo v-if="searchInfo !== null" :current="searchInfo.current" :total="searchInfo.total" @prev="prev" @next="next"/>
        <Separator/>
        <LockOnButton v-model:value="editableLockOn"/>
        <Button class="flex-item no-grow-shrink" icon="plus" square @click="paneState.openCreateView()"/>
    </BrowserTeleport>

    <PaneLayout :show-pane="paneState.opened.value">
        <template #pane>
            <BasePane @close="paneState.closeView()">
                <TagCreatePane v-if="paneState.mode.value === 'create'"/>
                <TagDetailPane v-else-if="paneState.mode.value === 'detail'"/>
            </BasePane>
        </template>

        <div :class="$style.content">
            <TagTree v-if="data?.length || loading" ref="tagTreeRef" :tags="data" editable draggable :droppable="editableLockOn" @click="onClick" @move="onMove" @create="onCreate" @delete="onDelete"/>
            <Block v-else class="mt-2 p-2 has-text-centered">
                <Button type="success" size="small" icon="plus" @click="paneState.openCreateView()">创建第一个标签</Button>
            </Block>
        </div>
    </PaneLayout>
</template>

<style module lang="sass">
.content
    height: 100%
    overflow-y: auto
    padding: 2px 6px
    box-sizing: border-box
</style>
