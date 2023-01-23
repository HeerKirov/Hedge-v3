<script setup lang="ts">
import { toRefs } from "vue"
import { ThumbnailImage, Icon, Button } from "@/components/universal"
import { CheckBox, Select } from "@/components/form"
import { TagmeEditor, DateEditor } from "@/components-business/form-editor"
import { OrderTimeType } from "@/functions/http-client/api/setting-import"
import { useImportDetailPaneMultiple } from "./context"

const props = defineProps<{
    selected: number[]
    latest: number
}>()

const { selected, latest } = toRefs(props)

const { data, actives, anyActive, form, submit, clear } = useImportDetailPaneMultiple(selected, latest)

const timeTypes: {value: OrderTimeType, label: string}[] = [
    {value: "IMPORT_TIME", label: "按 项目导入时间 设定"},
    {value: "CREATE_TIME", label: "按 文件创建时间 设定"},
    {value: "UPDATE_TIME", label: "按 文件修改时间 设定"}
]

</script>

<template>
    <ThumbnailImage minHeight="12rem" maxHeight="40rem" :file="data?.thumbnailFile"/>
    <p v-if="data?.fileName" class="selectable word-wrap-anywhere mb-1">{{data.fileName}}</p>
    <p><Icon icon="edit"/>批量编辑</p>
    <p class="mt-2"><CheckBox v-model:value="actives.tagme">设置Tagme</CheckBox></p>
    <TagmeEditor v-if="actives.tagme" class="mt-1 mb-2" v-model:value="form.tagme"/>
    <p class="mt-1"><CheckBox v-model:value="actives.setCreatedTimeBy">设置创建时间</CheckBox></p>
    <Select v-if="actives.setCreatedTimeBy" class="mt-1 mb-2" :items="timeTypes" v-model:value="form.setCreatedTimeBy"/>
    <p class="mt-1"><CheckBox v-model:value="actives.setOrderTimeBy">设置排序时间</CheckBox></p>
    <Select v-if="actives.setOrderTimeBy" class="mt-1 mb-2" :items="timeTypes" v-model:value="form.setOrderTimeBy"/>
    <p class="mt-1"><CheckBox v-model:value="actives.partitionTime">设置时间分区</CheckBox></p>
    <DateEditor v-if="actives.partitionTime" class="mt-1 mb-2" v-model:value="form.partitionTime"/>
    <p class="mt-1"><CheckBox v-model:value="form.analyseSource">重新分析来源</CheckBox></p>
    <Button class="w-100 mt-3" icon="check" :type="anyActive ? 'primary' : undefined" :mode="anyActive ? 'filled' : undefined" :disabled="!anyActive">批量更改</Button>
</template>
