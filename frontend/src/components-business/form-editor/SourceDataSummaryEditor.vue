<script setup lang="ts">
import { Input } from "@/components/form"
import { Flex, FlexItem } from "@/components/layout"
import { SourceBook, SourceTag } from "@/functions/http-client/api/source-data"

interface SummaryData {
    title: string
    description: string
    tags: SourceTag[]
    books: SourceBook[]
    relations: number[]
}

const props = defineProps<{
    data: SummaryData
}>()

const emit = defineEmits<{
    (e: "update:data", data: SummaryData): void
}>()

const updateTitle = (v: string) => emit("update:data", {...props.data, title: v})

const updateDescription = (v: string) => emit("update:data", {...props.data, description: v})

</script>

<template>
    <div>
        <label class="label">标题</label>
        <Input width="large" :value="data.title" @update:value="updateTitle"/>
    </div>
    <div class="mt-1">
        <label class="label">描述</label>
        <Input type="textarea" width="large" :value="data.description" @update:value="updateDescription"/>
    </div>
    <div class="mt-1">
        <label class="label">标签</label>
    </div>
    <Flex class="mt-1">
        <FlexItem :width="60">
            <label class="label">集合</label>
        </FlexItem>
        <FlexItem :width="40">
            <label class="label">关联项</label>
        </FlexItem>
    </Flex>
</template>

<style module lang="sass">

</style>
