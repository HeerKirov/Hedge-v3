<script setup lang="ts">
import { Starlight, Separator } from "@/components/universal"
import { FormEditKit } from "@/components/interaction"
import {
    TagNameAndOtherDisplay, TagAddressTypeDisplay, TagGroupTypeDisplay, TagLinkDisplay, TagExampleDisplay,
    DescriptionDisplay, SourceTagMappingDisplay
} from "@/components-business/form-display"
import {
    TagNameAndOtherEditor, TagAddressTypeEditor, TagGroupTypeEditor, TagLinkEditor, TagExampleEditor,
    DescriptionEditor, SourceTagMappingEditor
} from "@/components-business/form-editor"
import { useTagDetailPane } from "@/services/main/tag"

const { data, addressInfo, isRootNode, setName, setType, setGroup, setDescription, setLinks, setMappingSourceTags, setExamples } = useTagDetailPane()

</script>

<template>
    <i class="selectable">
        {{addressInfo.address}}
    </i>
    <template v-if="data !== null">
        <FormEditKit class="mt-1" :value="([data.name, data.otherNames, data.color] as const)" :set-value="setName">
            <template #default="{ value: [name, otherNames, color] }">
                <TagNameAndOtherDisplay :name="name" :other-names="otherNames" :color="color"/>
            </template>
            <template #edit="{ value: [name, otherNames, color], setValue, save }">
                <TagNameAndOtherEditor :name="name" :other-names="otherNames" :color="color" :color-enabled="isRootNode" @update="setValue" @save="save"/>
            </template>
        </FormEditKit>

        <FormEditKit class="mt-2" :value="data.type" :set-value="setType" save-once-updated>
            <template #default="{ value }">
                <TagAddressTypeDisplay :value="value"/>
            </template>
            <template #edit="{ value, setValue, save }">
                <TagAddressTypeEditor :value="value" @update:value="setValue" @save="save"/>
            </template>
        </FormEditKit>

        <FormEditKit class="mt-1" :value="[data.isSequenceGroup, data.isOverrideGroup] as const" :set-value="setGroup">
            <template #default="{ value: [isSequenceGroup, isOverrideGroup] }">
                <TagGroupTypeDisplay :is-sequence-group="isSequenceGroup" :is-override-group="isOverrideGroup" :member="addressInfo.member" :member-index="addressInfo.memberIndex"/>
            </template>
            <template #edit="{ value: [isSequenceGroup, isOverrideGroup], setValue }">
                <TagGroupTypeEditor :is-sequence-group="isSequenceGroup" :is-override-group="isOverrideGroup" @update:is-sequence-group="v => setValue([v, isOverrideGroup])" @update:is-override-group="v => setValue([isSequenceGroup, v])"/>
            </template>
        </FormEditKit>

        <Separator direction="horizontal" :spacing="2"/>

        <FormEditKit :value="data.description" :set-value="setDescription">
            <template #default="{ value }">
                <DescriptionDisplay :value="value" new-skin/>
            </template>
            <template #edit="{ value, setValue, save }">
                <DescriptionEditor :value="value" @update:value="setValue" @save="save"/>
            </template>
        </FormEditKit>

        <Separator direction="horizontal" :spacing="2"/>
        
        <Starlight v-if="data.score !== null" class="is-inline-block mt-4" :value="data.score"/>

        <label class="label is-font-size-small">标签链接</label>
        <FormEditKit class="mt-2" :value="data.links" :set-value="setLinks">
            <template #default="{ value }">
                <TagLinkDisplay :value="value"/>
            </template>
            <template #edit="{ value, setValue, save }">
                <TagLinkEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>

        <label class="mt-4 label is-font-size-small">来源标签映射</label>
        <FormEditKit :value="data.mappingSourceTags" :set-value="setMappingSourceTags">
            <template #default="{ value }">
                <SourceTagMappingDisplay :value="value" direction="vertical"/>
            </template>
            <template #edit="{ value, setValue }">
                <SourceTagMappingEditor :value="value" @update:value="setValue" direction="vertical"/>
            </template>
        </FormEditKit>

        <label class="mt-4 label is-font-size-small">示例</label>
        <FormEditKit :value="data.examples" :set-value="setExamples">
            <template #default="{ value }">
                <TagExampleDisplay :value="value"/>
            </template>
            <template #edit="{ value, setValue }">
                <TagExampleEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>
    </template>
</template>
