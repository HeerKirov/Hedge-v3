<script setup lang="ts">
import { Button, Block } from "@/components/universal"
import { TopBarLayout, PaneLayout, BasePane, MiddleLayout } from "@/components/layout"
import { SearchInput } from "@/components-business/top-bar"
import { TagTree } from "@/components-module/data"
import { installTagContext } from "@/services/main/tag"
import TagCreatePane from "./TagCreatePane.vue"
import TagDetailPane from "./TagDetailPane.vue"

const { paneState, listview: { loading, data, tagTreeEvents } } = installTagContext()

</script>

<template>
 <TopBarLayout>
     <template #top-bar>
        <MiddleLayout>
            <SearchInput placeholder="在此处搜索"/>

            <template #right>
                <Button icon="lock" square/>
                <Button icon="plus" square @click="paneState.createView()"/>
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
             <TagTree v-if="data?.length || loading" :tags="data" editable draggable v-bind="tagTreeEvents"/>
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
