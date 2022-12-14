<script setup lang="ts">
import { Button } from "@/components/universal"
import { VirtualRowView } from "@/components/data"
import { TopBarLayout, PaneLayout, BasePane, MiddleLayout } from "@/components/layout"
import { SearchInput, AttachFilter, SelectButton, DataRouter, AttachTemplate } from "@/components-business/top-bar"
import {
    ANNOTATION_TARGET_TYPE_ICONS, ANNOTATION_TARGET_TYPE_NAMES, ANNOTATION_TARGET_TYPES,
    META_TYPE_ICONS, META_TYPE_NAMES, META_TYPES
} from "@/constants/entity"
import { installAnnotationContext } from "@/services/main/annotation"
import AnnotationListItem from "./AnnotationListItem.vue"
import AnnotationDetailPane from "./AnnotationDetailPane.vue"
import AnnotationCreatePane from "./AnnotationCreatePane.vue"
import { usePopupMenu } from "@/modules/popup-menu";

const { paneState, listview: { queryFilter, paginationData, operators } } = installAnnotationContext()

const filterMetaTypeOptions = META_TYPES.map(type => ({value: type, label: META_TYPE_NAMES[type], icon: META_TYPE_ICONS[type]}))

const attachFilterTemplates: AttachTemplate[] = [
    {
        type: "radio",
        field: "target",
        options: ANNOTATION_TARGET_TYPES.map(t => ({label: ANNOTATION_TARGET_TYPE_NAMES[t], value: t, icon: ANNOTATION_TARGET_TYPE_ICONS[t]}))
    },
    {type: "separator"},
    {
        type: "radio",
        field: "canBeExported",
        options: [
            {label: "可导出", value: true, icon: "share-square"},
            {label: "不可导出", value: false, icon: "share-alt-square"}
        ]
    },
    {type: "separator"},
    {
        type: "order",
        items: [
            {label: "按名称", value: "name"},
            {label: "按创建顺序", value: "createTime"}
        ],
        defaultValue: "createTime",
        defaultDirection: "descending"
    }
]

const popupMenu = usePopupMenu([
    {type: "normal", label: "查看详情", click: paneState.detailView},
    {type: "separator"},
    {type: "normal", label: "以此为模板新建", click: operators.createByTemplate},
    {type: "separator"},
    {type: "normal", label: "删除此注解", click: operators.deleteItem},
])

</script>

<template>
    <TopBarLayout>
        <template #top-bar>
            <MiddleLayout>
                <SelectButton :items="filterMetaTypeOptions" v-model:value="queryFilter.type"/>
                <SearchInput class="ml-1" placeholder="在此处搜索" v-model:value="queryFilter.query"/>
                <AttachFilter class="ml-1" :templates="attachFilterTemplates" v-model:value="queryFilter"/>

                <template #right>
                    <DataRouter/>
                    <Button icon="plus" square @click="paneState.createView()"/>
                </template>
            </MiddleLayout>
        </template>

        <PaneLayout :show-pane="paneState.isOpen()">
            <template #pane>
                <BasePane @close="paneState.closeView()">
                    <AnnotationDetailPane v-if="paneState.isDetailView()"/>
                    <AnnotationCreatePane v-else-if="paneState.isCreateView()"/>
                </BasePane>
            </template>
            <VirtualRowView :row-height="40" :padding="6" :buffer-size="10" v-bind="paginationData.data.metrics" @update="paginationData.dataUpdate">
                <AnnotationListItem v-for="item in paginationData.data.result" :key="item.id"
                                    :item="item" :selected="paneState.isDetailView(item.id)"
                                    @click="paneState.detailView(item.id)"
                                    @contextmenu="popupMenu.popup(item.id)"/>
            </VirtualRowView>
        </PaneLayout>
    </TopBarLayout>
</template>
