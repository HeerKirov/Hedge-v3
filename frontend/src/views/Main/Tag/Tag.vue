<script setup lang="ts">
import { Button, Block } from "@/components/universal"
import { TopBarLayout, PaneLayout, BasePane, MiddleLayout, Group } from "@/components/layout"
import { SearchInput, SearchResultInfo } from "@/components-business/top-bar"
import { TagTree } from "@/components-module/data"
import { installTagContext } from "@/services/main/tag"
import TagCreatePane from "./TagCreatePane.vue"
import TagDetailPane from "./TagDetailPane.vue"

const {
    paneState,
    editableLockOn,
    listview: { loading, data, tagTreeEvents },
    search: { searchText, searchInfo, tagTreeRef, next, prev }
} = installTagContext()

</script>

<template>
 <TopBarLayout>
     <template #top-bar>
        <MiddleLayout>
            <SearchInput placeholder="在此处搜索" v-model:value="searchText" @enter="nv => { if(!nv) next() }"/>
            <SearchResultInfo v-if="searchInfo !== null" :current="searchInfo.current" :total="searchInfo.total" @prev="prev" @next="next"/>

            <template #right>
                <Group single-line>
                    <Button v-if="editableLockOn" mode="filled" type="danger" icon="lock-open" square @click="editableLockOn = false"/>
                    <Button v-else icon="lock" square @click="editableLockOn = true"/>
                    <Button icon="plus" square @click="paneState.createView()"/>
                </Group>
            </template>
        </MiddleLayout>
     </template>

     <PaneLayout :show-pane="paneState.isOpen()">
         <template #pane>
            <BasePane @close="paneState.closeView()">
                <TagCreatePane v-if="paneState.isCreateView()"/>
                <TagDetailPane v-else-if="paneState.isDetailView()"/>
            </BasePane>
         </template>

         <div :class="$style.content">
             <TagTree v-if="data?.length || loading" ref="tagTreeRef" :tags="data" editable draggable :droppable="editableLockOn" v-bind="tagTreeEvents"/>
             <Block v-else class="mt-2 p-2 has-text-centered">
                 <Button type="success" size="small" icon="plus" @click="paneState.createView()">创建第一个标签</Button>
             </Block>
         </div>
     </PaneLayout>
 </TopBarLayout>
</template>

<style module lang="sass">
@import "../../../styles/base/size"

.content
    height: 100%
    overflow-y: auto
    padding: $spacing-1 $spacing-3
    box-sizing: border-box
</style>
