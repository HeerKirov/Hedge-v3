<script setup lang="ts">
import { computed } from "vue"
import { Block, Icon } from "@/components/universal"
import { Input, Select } from "@/components/form"
import { Flex } from "@/components/layout"
import { OtherNameEditor, DescriptionEditor, RelatedAnnotationEditor, SourceTagMappingEditor, ScoreEditor } from "@/components-business/form-editor"
import { AuthorType } from "@/functions/http-client/api/author"
import { SimpleAnnotation } from "@/functions/http-client/api/annotations"
import { MappingSourceTag } from "@/functions/http-client/api/source-tag-mapping"
import { AUTHOR_TYPE_ICONS, AUTHOR_TYPE_NAMES, AUTHOR_TYPES } from "@/constants/entity"

interface Props {
    name: string
    otherNames: string[]
    type: AuthorType
    annotations: SimpleAnnotation[]
    keywords: string[]
    description: string
    score: number | null
    mappingSourceTags: MappingSourceTag[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
    <T extends keyof Props>(e: "set-property", key: T, value: Props[T]): void
}>()

const keywordText = computed(() => props.keywords.join(" "))

const setName = (v: string) => emit("set-property", "name", v)
const setOtherNames = (v: string[]) => emit("set-property", "otherNames", v)
const setType = (v: AuthorType) => emit("set-property", "type", v)
const setKeywords = (v: string) => {
    const s = v.trim()
    const keywords = s ? s.split(/\s+/) : []
    emit("set-property", "keywords", keywords)
}
const setDescription = (v: string) => emit("set-property", "description", v)
const setScore = (v: number | null) => emit("set-property", "score", v)
const setAnnotations = (v: SimpleAnnotation[]) => emit("set-property", "annotations", v)
const setMappingSourceTags = (v: MappingSourceTag[]) => emit("set-property", "mappingSourceTags", v)

const AUTHOR_TYPE_SELECT_ITEMS = AUTHOR_TYPES.map(t => ({label: AUTHOR_TYPE_NAMES[t], value: t}))

</script>

<template>
    <Block class="p-3">
        <div>
            <label class="label">作者名称</label>
            <Input width="fullwidth" :value="name" @update:value="setName"/>
        </div>
        <Flex :width="60">
            <div>
                <label class="label">别名</label>
                <OtherNameEditor :value="otherNames" @update:value="setOtherNames"/>
            </div>
        </Flex>
        <div class="mt-2">
            <label class="label">类型</label>
            <span class="is-line-height-std mx-1"><Icon :icon="AUTHOR_TYPE_ICONS[type]"/></span>
            <Select :items="AUTHOR_TYPE_SELECT_ITEMS" :value="type" @update:value="setType as any"/>
        </div>
        <div class="mt-2">
            <label class="label">描述</label>
            <DescriptionEditor :value="description" @update:value="setDescription"/>
            <Input class="mt-1" placeholder="描述关键字" width="fullwidth" :value="keywordText" @update:value="setKeywords"/>
        </div>
        <div class="mt-2">
            <label class="label">注解</label>
            <RelatedAnnotationEditor meta-type="AUTHOR" :value="annotations" @update:value="setAnnotations"/>
        </div>
        <Flex class="mt-2" :width="40">
            <div>
                <label class="label">评分</label>
                <ScoreEditor :value="score" @update:value="setScore"/>
            </div>
        </Flex>
    </Block>
    <Block class="p-3 mt-2">
        <label class="label">来源标签映射</label>
        <SourceTagMappingEditor :value="mappingSourceTags" @update:value="setMappingSourceTags"/>
    </Block>
</template>
