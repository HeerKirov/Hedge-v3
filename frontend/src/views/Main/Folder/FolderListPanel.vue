<script setup lang="ts">
import { Button, Block } from "@/components/universal"
import { Group, PaneLayout, BasePane } from "@/components/layout"
import { TopBarLayout, MiddleLayout } from "@/components/layout"
import { SearchInput, SearchResultInfo } from "@/components-business/top-bar"
import { FolderTable } from "@/components-module/data"
import { useFolderContext } from "@/services/main/folder"
import FolderDetailPane from "./FolderDetailPane.vue"

const {
    paneState,
    listview: { loading, data },
    editableLockOn,
    operators: { createPosition, openCreatePosition, createItem, setPinned, moveItem, deleteItem, openDetail },
    search: { searchText, searchInfo, folderTableRef, next, prev }
} = useFolderContext()

const updateSelected = (folderId: number | null) => {
    if(folderId !== null) {
        paneState.openDetailView(folderId)
    }else if(paneState.detailPath.value !== null) {
        paneState.closeView()
    }
}

</script>

<template>
    <TopBarLayout>
        <template #top-bar>
            <MiddleLayout>
                <SearchInput placeholder="在此处搜索" v-model:value="searchText" @enter="nv => { if(!nv) next() }"/>
                <SearchResultInfo v-if="searchInfo !== null" :current="searchInfo.current" :total="searchInfo.total" @prev="prev" @next="next"/>

                <template #right>
                    <Group single-line>
                        <Button square :mode="editableLockOn ? 'filled' : undefined" :type="editableLockOn ? 'danger' : undefined" :icon="editableLockOn ? 'lock-open' : 'lock'" @click="editableLockOn = !editableLockOn"/>
                        <Button square icon="plus" @click="openCreatePosition"/>
                    </Group>
                </template>
            </MiddleLayout>
        </template>

        <PaneLayout :show-pane="paneState.opened.value">
            <template #pane>
                <BasePane @close="paneState.closeView()">
                    <FolderDetailPane/>
                </BasePane>
            </template>

            <Block :class="$style['table-block']">
                <FolderTable v-if="!loading && (data?.length || createPosition)" ref="folderTableRef" :folders="data" editable :droppable="editableLockOn" v-model:create-position="createPosition"
                             :selected="paneState.detailPath.value ?? undefined"
                             @update:selected="updateSelected" @update:pinned="setPinned"
                             @create="createItem" @move="moveItem" @delete="deleteItem" @enter="openDetail"/>
                <Button v-else-if="!loading" size="small" type="success" icon="plus" @click="openCreatePosition">创建第一个节点或目录</Button>
            </Block>
        </PaneLayout>
    </TopBarLayout>
</template>

<style module lang="sass">
.table-block
    margin: 0.375rem
    padding: 0.5rem
</style>
