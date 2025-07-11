<script setup lang="ts">
import { Button, Block, Separator } from "@/components/universal"
import { PaneLayout, BasePane } from "@/components/layout"
import { BrowserTeleport } from "@/components/logical"
import { ElementPopupMenu } from "@/components/interaction"
import { SearchBox, SearchResultInfo, LockOnButton } from "@/components-business/top-bar"
import { FolderTable } from "@/components-module/data"
import { MenuItem } from "@/modules/popup-menu"
import { installFolderContext } from "@/services/main/folder"
import FolderListPane from "./FolderListPane.vue"

const {
    paneState,
    listview: { loading, data },
    selector: { selected, selectedIndex, lastSelected, update: updateSelect },
    editableLockOn,
    operators: { createPosition, openCreatePosition, createItem, setPinned, moveItem, deleteItem, openDetail },
    search: { searchText, searchInfo, folderTableRef, next, prev }
} = installFolderContext()

const ellipsisMenuItems = () => <MenuItem<undefined>[]>[
    {type: "checkbox", label: "在侧边栏预览", checked: paneState.visible.value, click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "checkbox", label: "解除编辑锁定", checked: editableLockOn.value, click: () => editableLockOn.value = !editableLockOn.value},
]

</script>

<template>
    <BrowserTeleport to="top-bar">
        <SearchBox placeholder="在此处搜索" v-model:value="searchText" @enter="nv => { if(!nv) next() }"/>
        <SearchResultInfo v-if="searchInfo !== null" :current="searchInfo.current" :total="searchInfo.total" @prev="prev" @next="next"/>
        <Separator/>
        <LockOnButton v-model:value="editableLockOn"/>
        <ElementPopupMenu :items="ellipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
            <Button :ref="setEl" class="flex-item no-grow-shrink" square icon="ellipsis-v" @click="popup"/>
        </ElementPopupMenu>
    </BrowserTeleport>

    <PaneLayout scope-name="folder" :show-pane="paneState.visible.value">
        <template #pane>
            <BasePane @close="paneState.visible.value = false">
                <FolderListPane/>
            </BasePane>
        </template>

        <div :class="$style.root">
            <Block :class="$style['table-block']">
                <FolderTable v-if="!loading && (data?.length || createPosition)" ref="folderTableRef" :folders="data" editable :droppable="editableLockOn" v-model:create-position="createPosition"
                             :selected="selected" :selected-index="selectedIndex" :last-selected="lastSelected"
                             @select="updateSelect" @update:pinned="setPinned"
                             @create="createItem" @move="moveItem" @delete="deleteItem" @enter="openDetail"/>
                <Button v-else-if="!loading" size="small" type="success" icon="plus" @click="openCreatePosition">创建第一个节点或目录</Button>
            </Block>
        </div>
    </PaneLayout>
</template>

<style module lang="sass">
.root
    overflow-y: auto
    height: 100%
    width: 100%
.table-block
    margin: 0.375rem
    padding: 0.5rem
</style>
