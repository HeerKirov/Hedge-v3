<script setup lang="ts">
import { Button, Separator } from "@/components/universal"
import { VirtualRowView } from "@/components/data"
import { PaneLayout, BasePane } from "@/components/layout"
import { BrowserTeleport } from "@/components/logical"
import { SearchBox, AttachFilter, SelectButton, DataRouter, AttachTemplate } from "@/components-business/top-bar"
import {
    ANNOTATION_TARGET_TYPE_ICONS, ANNOTATION_TARGET_TYPE_NAMES, ANNOTATION_TARGET_TYPES,
    META_TYPE_ICONS, META_TYPE_NAMES, META_TYPES
} from "@/constants/entity"
import { usePopupMenu } from "@/modules/popup-menu"
import { installAnnotationContext } from "@/services/main/annotation"
import AnnotationListItem from "./AnnotationListItem.vue"
import AnnotationDetailPane from "./AnnotationDetailPane.vue"
import AnnotationCreatePane from "./AnnotationCreatePane.vue"

const { paneState, listview: { queryFilter, paginationData: { data, state, setState, navigateTo } }, operators } = installAnnotationContext()

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
    {type: "normal", label: "查看详情", click: paneState.openDetailView},
    {type: "separator"},
    {type: "normal", label: "以此为模板新建", click: operators.createByTemplate},
    {type: "separator"},
    {type: "normal", label: "删除此注解", click: operators.deleteItem},
])

</script>

<template>
    <BrowserTeleport to="top-bar">
        <SelectButton :items="filterMetaTypeOptions" v-model:value="queryFilter.type"/>
        <SearchBox class="ml-1" placeholder="在此处搜索" v-model:value="queryFilter.query"/>
        <AttachFilter class="ml-1" :templates="attachFilterTemplates" v-model:value="queryFilter"/>
        <Separator/>
        <DataRouter :state="state" @navigate="navigateTo"/>
        <Button class="flex-item no-grow-shrink" icon="plus" square @click="paneState.openCreateView()"/>
    </BrowserTeleport>

    <PaneLayout :show-pane="paneState.opened.value">
        <template #pane>
            <BasePane @close="paneState.closeView()">
                <AnnotationDetailPane v-if="paneState.mode.value === 'detail'"/>
                <AnnotationCreatePane v-else-if="paneState.mode.value === 'create'"/>
            </BasePane>
        </template>
        <VirtualRowView :row-height="40" :padding="6" :metrics="data.metrics" :state="state" @update:state="setState">
            <AnnotationListItem v-for="item in data.items" :key="item.id"
                                :item="item" :selected="paneState.detailPath.value === item.id"
                                @click="paneState.openDetailView(item.id)"
                                @contextmenu="popupMenu.popup(item.id)"/>
        </VirtualRowView>
    </PaneLayout>
</template>
