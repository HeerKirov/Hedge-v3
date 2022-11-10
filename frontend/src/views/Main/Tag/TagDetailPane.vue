<script setup lang="ts">
import { FormEditKit } from "@/components/interaction"
import {
    TagNameAndOtherDisplay, TagAddressTypeDisplay, TagGroupTypeDisplay, TagLinkDisplay,
    DescriptionDisplay, RelatedAnnotationDisplay, ScoreDisplay, SourceTagMappingDisplay
} from "@/components-business/form-display"
import {
    TagNameAndOtherEditor, TagAddressTypeEditor, TagGroupTypeEditor, TagLinkEditor,
    DescriptionEditor, RelatedAnnotationEditor, SourceTagMappingEditor
} from "@/components-business/form-editor"
import { useTagDetailPane } from "@/services/main/tag"

const { data, addressInfo, isRootNode, setName, setType, setGroup, setAnnotations, setDescription, setLinks, setMappingSourceTags, setExamples } = useTagDetailPane()

</script>

<template>
    <p class="selectable">
        {{addressInfo.address}}
    </p>
    <template v-if="data !== null">
        <FormEditKit class="mt-1" :value="[data.name, data.otherNames, data.color]" :set-value="setName">
            <template #default="{ value: [name, otherNames, color] }">
                <TagNameAndOtherDisplay :name="name" :other-names="otherNames" :color="color"/>
            </template>
            <template #edit="{ value: [name, otherNames, color], setValue, save }">
                <TagNameAndOtherEditor :name="name" :other-names="otherNames" :color="color" :color-enabled="isRootNode" @update="setValue" @save="save"/>
            </template>
        </FormEditKit>

        <FormEditKit class="mt-2" :value="data.type" :set-value="setType">
            <template #default="{ value }">
                <TagAddressTypeDisplay :value="value"/>
            </template>
            <template #edit="{ value, setValue, save }">
                <TagAddressTypeEditor :value="value" @update:value="setValue" @save="save"/>
            </template>
        </FormEditKit>

        <FormEditKit :value="data.group" :set-value="setGroup">
            <template #default="{ value }">
                <TagGroupTypeDisplay :value="value" :member="addressInfo.member" :member-index="addressInfo.memberIndex"/>
            </template>
            <template #edit="{ value, setValue }">
                <TagGroupTypeEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>

        <FormEditKit class="mt-4" :value="data.description" :set-value="setDescription">
            <template #default="{ value }">
                <DescriptionDisplay :value="value"/>
            </template>
            <template #edit="{ value, setValue, save }">
                <DescriptionEditor :value="value" @update:value="setValue" @save="save"/>
            </template>
        </FormEditKit>

        <FormEditKit class="mt-1" :value="data.annotations" :set-value="setAnnotations">
            <template #default="{ value }">
                <RelatedAnnotationDisplay :value="value"/>
            </template>
            <template #edit="{ value, setValue, save }">
                <RelatedAnnotationEditor mode="embedded" :value="value" meta-type="TAG" @update:value="setValue"/>
            </template>
        </FormEditKit>

        <FormEditKit class="mt-5" :value="data.links" :set-value="setLinks">
            <template #default="{ value }">
                <TagLinkDisplay :value="value"/>
            </template>
            <template #edit="{ value, setValue, save }">
                <TagLinkEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>

        <ScoreDisplay v-if="data.score !== null" class="mt-4" :value="data.score"/>

        <label class="mt-4 label is-font-size-small">来源标签映射</label>
        <FormEditKit :value="data.links" :set-value="setLinks">
            <template #default="{ value }">
                <SourceTagMappingDisplay :value="value"/>
            </template>
            <template #edit="{ value, setValue, save }">
                <SourceTagMappingEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>

        <label class="mt-4 label is-font-size-small">示例</label>
    </template>
</template>
