<script setup lang="ts">
import { Block, Icon, Starlight } from "@/components/universal"
import { Input, Select } from "@/components/form"
import { Flex } from "@/components/layout"
import { OtherNameEditor, ParentTopicEditor, DescriptionEditor, SourceTagMappingEditor, MetaKeywordEditor } from "@/components-business/form-editor"
import { ParentTopic, TopicType } from "@/functions/http-client/api/topic"
import { MappingSourceTag } from "@/functions/http-client/api/source-tag-mapping"
import { TOPIC_TYPE_ICONS, TOPIC_TYPE_NAMES, TOPIC_TYPES } from "@/constants/entity"

interface Props {
    name: string
    otherNames: string[]
    type: TopicType
    parent: ParentTopic | null
    keywords: string[]
    description: string
    score: number | null
    mappingSourceTags: MappingSourceTag[]
}

defineProps<Props>()

const emit = defineEmits<{
    <T extends keyof Props>(e: "set-property", key: T, value: Props[T]): void
}>()

const setName = (v: string) => emit("set-property", "name", v)
const setOtherNames = (v: string[]) => emit("set-property", "otherNames", v)
const setType = (v: TopicType) => emit("set-property", "type", v)
const setKeywords = (v: string[]) => emit("set-property", "keywords", v)
const setDescription = (v: string) => emit("set-property", "description", v)
const setScore = (v: number | null) => emit("set-property", "score", v)
const setParent = (v: ParentTopic | null) => emit("set-property", "parent", v)
const setMappingSourceTags = (v: MappingSourceTag[]) => emit("set-property", "mappingSourceTags", v)

const TOPIC_TYPE_SELECT_ITEMS = TOPIC_TYPES.map(t => ({label: TOPIC_TYPE_NAMES[t], value: t}))

</script>

<template>
    <Block class="p-3">
        <div>
            <label class="label">主题名称</label>
            <Input width="fullwidth" :value="name" @update:value="setName"/>
        </div>
        <Flex :width="60">
            <div>
                <label class="label">别名</label>
                <OtherNameEditor :value="otherNames" @update:value="setOtherNames"/>
            </div>
        </Flex>
        <Flex class="mt-2" :width="100">
            <div>
                <label class="label">类型</label>
                <span class="is-line-height-std mx-1"><Icon :icon="TOPIC_TYPE_ICONS[type]"/></span>
                <Select :items="TOPIC_TYPE_SELECT_ITEMS" :value="type" @update:value="setType as any"/>
            </div>
            <div>
                <label class="label">父主题</label>
                <ParentTopicEditor class="is-line-height-std" :value="parent" @update:value="setParent"/>
            </div>
        </Flex>
        <div class="mt-2">
            <label class="label">描述</label>
            <DescriptionEditor :value="description" @update:value="setDescription"/>
            <MetaKeywordEditor class="mt-1" meta-type="TOPIC" :value="keywords" @update:value="setKeywords"/>
        </div>
        <Flex class="mt-2" :width="40">
            <div>
                <label class="label">评分</label>
                <Starlight editable :value="score" @update:value="setScore"/>
            </div>
        </Flex>
    </Block>
    <Block class="p-3 mt-2">
        <label class="label">来源标签映射</label>
        <SourceTagMappingEditor :value="mappingSourceTags" @update:value="setMappingSourceTags"/>
    </Block>
</template>
