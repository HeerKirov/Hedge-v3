<script setup lang="ts">
import { CheckBox, Input } from "@/components/form"
import { Flex, FlexItem } from "@/components/layout"
import { SourceTagEditor, SourceBookEditor, SourceRelationEditor, SourceAdditionalInfoEditor } from "@/components-business/form-editor"
import { SourceAdditionalInfo, SourceBook, SourceTag } from "@/functions/http-client/api/source-data"
import { datetime, LocalDateTime } from "@/utils/datetime"
import DateTimeEditor from "./DateTimeEditor.vue"

interface SummaryData {
    title: string
    description: string
    tags: SourceTag[]
    books: SourceBook[]
    relations: string[]
    additionalInfo: SourceAdditionalInfo[]
    publishTime: LocalDateTime | null
}

const props = defineProps<{
    data: SummaryData,
    site: string | null
}>()

const emit = defineEmits<{
    (e: "update:data", data: SummaryData): void
}>()

const set = <K extends keyof SummaryData>(key: K, value: SummaryData[K]) => {
    emit("update:data", {...props.data, [key]: value})
}

const changePublishTime = (checked: boolean) => {
    if(checked && props.data.publishTime === null) {
        emit("update:data", {...props.data, publishTime: datetime.now()})
    }else if(!checked && props.data.publishTime !== null) {
        emit("update:data", {...props.data, publishTime: null})
    }
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
        <SourceTagEditor :site="site" :value="data.tags" @update:value="set('tags', $event)"/>
    </div>
    <Flex class="mt-1" :spacing="2">
        <FlexItem :width="40">
            <div>
                <label class="label">集合</label>
                <SourceBookEditor :value="data.books" @update:value="set('books', $event)"/>
            </div>
        </FlexItem>
        <FlexItem :width="30">
            <div>
                <label class="label">关联项</label>
                <SourceRelationEditor :value="data.relations" @update:value="set('relations', $event)"/>
            </div>
        </FlexItem>
        <FlexItem :width="30">
            <div>
                <label class="label">附加信息*</label>
                <SourceAdditionalInfoEditor :site="site" v-model:value="data.additionalInfo"/>
            </div>
        </FlexItem>
    </Flex>
    <div>
        <label class="label"><CheckBox :value="data.publishTime !== null" @update:value="changePublishTime"/>发布时间</label>
        <DateTimeEditor v-if="data.publishTime !== null" single-line :value="data.publishTime" @update:value="set('publishTime', $event)"/>
    </div>
</template>
