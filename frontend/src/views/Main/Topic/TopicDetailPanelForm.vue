<script setup lang="ts">
import { computed, Ref } from "vue"
import { Block, Icon } from "@/components/universal"
import { Input, Select } from "@/components/form"
import { Flex, FlexItem } from "@/components/layout"
import { OtherNameEditor, ParentTopicEditor, DescriptionEditor, RelatedAnnotationEditor } from "@/components-business/form-editor"
import { ParentTopic, TopicType } from "@/functions/http-client/api/topic"
import { SimpleAnnotation } from "@/functions/http-client/api/annotations"
import { MappingSourceTag } from "@/functions/http-client/api/source-tag-mapping"
import { TOPIC_TYPE_ICONS, TOPIC_TYPE_NAMES, TOPIC_TYPES } from "@/constants/entity"
import { FormEditorData } from "@/services/main/topic"
import ScoreEditor from "@/components-business/form-editor/ScoreEditor.vue";
import SourceTagMappingEditor from "@/components-business/form-editor/SourceTagMappingEditor.vue";

const props = defineProps<{
    data: FormEditorData
}>()

const emit = defineEmits<{
    <T extends keyof FormEditorData>(e: "set-property", key: T, value: FormEditorData[T]): void
}>()

const keywordText = computed(() => props.data.keywords.join(" "))

const setName = (v: string) => emit("set-property", "name", v)
const setOtherNames = (v: string[]) => emit("set-property", "otherNames", v)
const setType = (v: TopicType) => emit("set-property", "type", v)
const setKeywords = (v: string) => {
    const s = v.trim()
    const keywords = s ? s.split(/\s+/) : []
    emit("set-property", "keywords", keywords)
}
const setDescription = (v: string) => emit("set-property", "description", v)
const setScore = (v: number | null) => emit("set-property", "score", v)
const setAnnotations = (v: SimpleAnnotation[]) => emit("set-property", "annotations", v)
const setParent = (v: ParentTopic | null) => emit("set-property", "parent", v)
const setMappingSourceTags = (v: MappingSourceTag[]) => emit("set-property", "mappingSourceTags", v)

const TOPIC_TYPE_SELECT_ITEMS = TOPIC_TYPES.map(t => ({label: TOPIC_TYPE_NAMES[t], value: t}))

</script>

<template>
    <Block class="p-3">
        <div>
            <label class="label">主题名称</label>
            <Input width="fullwidth" :value="data.name" @update:value="setName"/>
        </div>
        <Flex :width="60">
            <div>
                <label class="label">别名</label>
                <OtherNameEditor :value="data.otherNames" @update:value="setOtherNames"/>
            </div>
        </Flex>
        <Flex class="mt-2" :width="100">
            <div>
                <label class="label">类型</label>
                <span class="is-line-height-std mx-1"><Icon :icon="TOPIC_TYPE_ICONS[data.type]"/></span>
                <Select :items="TOPIC_TYPE_SELECT_ITEMS" :value="data.type" @update:value="setType"/>
            </div>
            <div>
                <label class="label">父主题</label>
                <ParentTopicEditor class="is-line-height-std" :value="data.parent" @update:value="setParent"/>
            </div>
        </Flex>
        <div class="mt-2">
            <label class="label">简介</label>
            <DescriptionEditor :value="data.description" @update:value="setDescription"/>
            <Input class="mt-1" placeholder="描述关键字" width="fullwidth" :value="keywordText" @update:value="setKeywords"/>
        </div>
        <div class="mt-2">
            <label class="label">注解</label>
            <RelatedAnnotationEditor meta-type="TOPIC" :value="data.annotations" @update:value="setAnnotations"/>
        </div>
        <Flex class="mt-2" :width="40">
            <div>
                <label class="label">评分</label>
                <ScoreEditor :value="data.score" @update:value="setScore"/>
            </div>
        </Flex>
    </Block>
    <Block class="p-3">
        <label class="label">来源标签映射</label>
        <SourceTagMappingEditor :value="data.mappingSourceTags" @update:value="setMappingSourceTags"/>
    </Block>
</template>
