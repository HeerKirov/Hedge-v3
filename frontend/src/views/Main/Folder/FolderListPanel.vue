<script setup lang="ts">
import { Button, Block } from "@/components/universal"
import { Group, PaneLayout, BasePane } from "@/components/layout"
import { TopBarLayout, MiddleLayout } from "@/components/layout"
import { SearchInput } from "@/components-business/top-bar"
import { FolderTable } from "@/components-module/data"
import { useFolderContext } from "@/services/main/folder"
import FolderDetailPane from "./FolderDetailPane.vue"

const {
    paneState,
    listview: { loading, data },
    editableLockOn,
    operators: { createPosition, openCreatePosition, createItem, setPinned, moveItem, deleteItem, openDetail }
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
                <SearchInput placeholder="在此处搜索"/>

                <template #right>
                    <Group single-line>
                        <Button v-if="editableLockOn" square mode="filled" type="danger" icon="lock-open" @click="editableLockOn = false"/>
                        <Button v-else square icon="lock" @click="editableLockOn = true"/>
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
                <FolderTable v-if="!loading && (data?.length || createPosition)" :folders="data" editable :droppable="editableLockOn" v-model:create-position="createPosition"
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
