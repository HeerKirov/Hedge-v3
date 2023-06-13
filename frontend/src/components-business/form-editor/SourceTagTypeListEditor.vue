<script setup lang="ts">
import { Input } from "@/components/form"
import { Button } from "@/components/universal"
import { SourceSiteSelectBox } from "@/components-business/form-editor"
import { useSettingSite } from "@/services/setting"

defineOptions({
    inheritAttrs: false
})

const props = defineProps<{
    value: {sourceSite: string, tagType: string}[]
}>()

const emit = defineEmits<{
    (e: "update:value", value: {sourceSite: string, tagType: string}[]): void
}>()

useSettingSite()

const add = () => {
    emit("update:value", [...props.value, {sourceSite: "", tagType: ""}])
}

const updateValueSource = (index: number, v: string | null) => {
    emit("update:value", [...props.value.slice(0, index), {sourceSite: v ?? "", tagType: props.value[index].tagType, ...props.value.slice(index + 1)}])
}

const updateValueTagType = (index: number, v: string | null) => {
    emit("update:value", [...props.value.slice(0, index), {tagType: v ?? "", sourceSite: props.value[index].sourceSite, ...props.value.slice(index + 1)}])
}

const remove = (index: number) => {
    emit("update:value", [...props.value.slice(0, index), ...props.value.slice(index + 1)])
}

</script>

<template>
    <p v-for="(v, idx) in value" class="mb-1" v-bind="$attrs">
        <SourceSiteSelectBox :value="v.sourceSite" @update:value="updateValueSource(idx, $event)"/>
        <Input class="ml-1" width="half" placeholder="标签类型" :value="v.tagType" @update:value="updateValueTagType(idx, $event)"/>
        <Button class="ml-1" square icon="close" @click="remove(idx)"/>
    </p>
    <Button size="small" mode="filled" type="primary" icon="plus" @click="add">添加一行</Button>
</template>