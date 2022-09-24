<script setup lang="ts">
import { ref, watch } from "vue"
import { Button } from "@/components/universal"
import { SearchInput, AttachFilter, AttachTemplate } from "@/layouts/top-bar"
import { TopBarLayout, PaneLayout, BasePane, MiddleLayout } from "@/components/layout"
import { ANNOTATION_TARGET_TYPE_ICONS, ANNOTATION_TARGET_TYPE_NAMES, ANNOTATION_TARGET_TYPES } from "@/constants/entity"
import { Annotation } from "@/functions/http-client/api/annotations"

const d = ref(false)

const filter = ref({})

watch(filter, f => console.log("filter", f))

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
        type: "search",
        field: "annotation",
        label: "选择注解…",
        multiSelection: false,
        query: client => (offset, limit, search) => client.annotation.list({type: "TOPIC", offset, limit, query: search}),
        mapQuery: (item: Annotation) => ({label: item.name, value: item.id}),
        history: {
            list: client => client.searchUtil.history.annotations,
            push: client => item => client.searchUtil.history.push({type: "ANNOTATION", id: item.value as number}),
            mapList: (item: Annotation) => ({label: item.name, value: item.id})
        },
        displayStyle: "annotation"
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
</script>

<template>
    <TopBarLayout>
        <template #top-bar>
            <MiddleLayout>
                <SearchInput placeholder="在此处搜索" enable-drop-button v-model:active-drop-button="d"/>
                <AttachFilter class="ml-1" :templates="attachFilterTemplates" v-model:value="filter"/>

                <template #right>
                    <Button icon="plus" square/>
                </template>
            </MiddleLayout>
        </template>

        <PaneLayout show-pane>
            <template #pane>
                <BasePane>

                </BasePane>
            </template>
            hello?
        </PaneLayout>
    </TopBarLayout>
</template>

<style module lang="sass">

</style>
