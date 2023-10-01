<script setup lang="ts">
import { toRefs } from "vue"
import { CheckBox, Select } from "@/components/form"
import { Icon, Button } from "@/components/universal"
import { TagmeEditor, DateEditor } from "@/components-business/form-editor"
import { OrderTimeType } from "@/functions/http-client/api/setting"
import { useSideBarAction } from "@/services/main/import"

const props = defineProps<{
    filename: string | null
    selected: number[]
}>()

const { filename, selected } = toRefs(props)

const { actives, anyActive, form, submit } = useSideBarAction(selected)

const timeTypes: {value: OrderTimeType, label: string}[] = [
    {value: "IMPORT_TIME", label: "按 项目导入时间 设定"},
    {value: "CREATE_TIME", label: "按 文件创建时间 设定"},
    {value: "UPDATE_TIME", label: "按 文件修改时间 设定"}
]

</script>

<template>
    <p v-if="filename" class="selectable word-wrap-anywhere mb-1">{{filename}}</p>
    <p class="mt-2"><Icon icon="pen-nib"/>多选操作</p>
    <p class="mt-2"><CheckBox v-model:value="actives.tagme">设置Tagme</CheckBox></p>
    <TagmeEditor v-if="actives.tagme" class="mt-1 mb-2" v-model:value="form.tagme"/>
    <p class="mt-1"><CheckBox v-model:value="actives.setCreatedTimeBy">设置创建时间</CheckBox></p>
    <Select v-if="actives.setCreatedTimeBy" class="mt-1 mb-2" :items="timeTypes" v-model:value="form.setCreatedTimeBy"/>
    <p class="mt-1"><CheckBox v-model:value="actives.setOrderTimeBy">设置排序时间</CheckBox></p>
    <Select v-if="actives.setOrderTimeBy" class="mt-1 mb-2" :items="timeTypes" v-model:value="form.setOrderTimeBy"/>
    <p class="mt-1"><CheckBox v-model:value="actives.partitionTime">设置时间分区</CheckBox></p>
    <DateEditor v-if="actives.partitionTime" class="mt-1 mb-2" v-model:value="form.partitionTime"/>
    <p class="mt-1"><CheckBox v-model:value="form.analyseSource">重新分析来源</CheckBox></p>
    <Button class="w-100 mt-3" icon="check" :type="anyActive ? 'primary' : undefined" :mode="anyActive ? 'filled' : undefined" :disabled="!anyActive" @click="submit">批量更改</Button>
</template>
