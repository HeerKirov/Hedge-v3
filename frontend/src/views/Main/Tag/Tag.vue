<script setup lang="ts">
import { Button } from "@/components/universal"
import { TopBarLayout, PaneLayout, BasePane, MiddleLayout } from "@/components/layout"
import { SearchInput } from "@/components-business/top-bar"
import { TagTree } from "@/components-module/data"
import { TagTreeNode } from "@/functions/http-client/api/tag"

const tags: TagTreeNode[] = [
    {
        id: 1,
        name: "元数据",
        otherNames: [],
        type: "VIRTUAL_ADDR",
        group: "NO",
        color: "green",
        children: [
            {
                id: 2,
                name: "媒体类型",
                otherNames: [],
                type: "VIRTUAL_ADDR",
                group: "FORCE",
                color: "green",
                children: [
                    {
                        id: 3,
                        name: "漫画",
                        otherNames: [],
                        type: "TAG",
                        group: "NO",
                        color: "green",
                        children: []
                    },
                    {
                        id: 4,
                        name: "插画",
                        otherNames: [],
                        type: "TAG",
                        group: "NO",
                        color: "green",
                        children: []
                    }
                ]
            },
            {
                id: 5,
                name: "限制等级",
                otherNames: [],
                type: "VIRTUAL_ADDR",
                group: "FORCE_AND_SEQUENCE",
                color: "green",
                children: [
                    {
                        id: 6,
                        name: "R12",
                        otherNames: [],
                        type: "TAG",
                        group: "NO",
                        color: "green",
                        children: []
                    },
                    {
                        id: 7,
                        name: "全年龄",
                        otherNames: [],
                        type: "TAG",
                        group: "NO",
                        color: "green",
                        children: []
                    },
                    {
                        id: 8,
                        name: "R15",
                        otherNames: [],
                        type: "TAG",
                        group: "NO",
                        color: "green",
                        children: []
                    },
                    {
                        id: 9,
                        name: "R18",
                        otherNames: [],
                        type: "TAG",
                        group: "NO",
                        color: "green",
                        children: []
                    },
                    {
                        id: 10,
                        name: "R18-G",
                        otherNames: [],
                        type: "TAG",
                        group: "NO",
                        color: "green",
                        children: []
                    }
                ]
            },
            {
                id: 11,
                name: "美术",
                otherNames: [],
                type: "VIRTUAL_ADDR",
                group: "NO",
                color: "green",
                children: []
            },
            {
                id: 12,
                name: "信息",
                otherNames: [],
                type: "ADDR",
                group: "NO",
                color: "green",
                children: []
            }
        ]
    },
    {
        id: 13,
        name: "场景",
        otherNames: [],
        type: "VIRTUAL_ADDR",
        group: "NO",
        color: "teal",
        children: [
            {
                id: 14,
                name: "所处地点",
                otherNames: [],
                type: "VIRTUAL_ADDR",
                group: "NO",
                color: "teal",
                children: []
            }
        ]
    }
]

</script>

<template>
 <TopBarLayout>
     <template #top-bar>
        <MiddleLayout>
            <SearchInput placeholder="在此处搜索"/>

            <template #right>
                <Button icon="lock" square/>
                <Button icon="plus" square/>
            </template>
        </MiddleLayout>
     </template>

     <PaneLayout show-pane>
         <template #pane>
            <BasePane>

            </BasePane>
         </template>

         <div :class="$style.content">
            <TagTree :tags="tags" editable draggable/>
         </div>
     </PaneLayout>
 </TopBarLayout>
</template>

<style module lang="sass">
@import "../../../styles/base/size"

.content
    height: 100%
    overflow-y: auto
    padding: $spacing-4
    box-sizing: border-box
</style>
