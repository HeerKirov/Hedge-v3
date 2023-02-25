<script setup lang="ts">
import { Input } from "@/components/form"
import { Flex, FlexItem } from "@/components/layout"
import { SourceTagEditor, SourceBookEditor, SourceRelationEditor } from "@/components-business/form-editor"
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

const set = <K extends keyof SummaryData>(key: K, value: SummaryData[K]) => {
    emit("update:data", {...props.data, [key]: value})
}

</script>

<template>
    <div>
        <label class="label">标题</label>
        <Input width="fullwidth" :value="data.title" @update:value="set('title', $event)"/>
    </div>
    <div class="mt-1">
        <label class="label">描述</label>
        <Input type="textarea" width="fullwidth" :value="data.description" @update:value="set('description', $event)"/>
    </div>
    <div class="mt-1">
        <label class="label">标签</label>
        <SourceTagEditor :value="data.tags" @update:value="set('tags', $event)"/>
    </div>
    <Flex class="mt-1" :spacing="2">
        <FlexItem :width="65">
            <div>
                <label class="label">集合</label>
                <SourceBookEditor :value="data.books" @update:value="set('books', $event)"/>
            </div>
        </FlexItem>
        <FlexItem :width="35">
            <div>
                <label class="label">关联项</label>
                <SourceRelationEditor :value="data.relations" @update:value="set('relations', $event)"/>
            </div>
        </FlexItem>
    </Flex>
</template>
