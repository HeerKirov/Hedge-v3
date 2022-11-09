<script setup lang="ts">
import { FormEditKit } from "@/components/interaction"
import { TagNameAndOtherDisplay, TagAddressTypeDisplay, TagGroupTypeDisplay, DescriptionDisplay, RelatedAnnotationDisplay } from "@/components-business/form-display"
import { TagNameAndOtherEditor, TagAddressTypeEditor, TagGroupTypeEditor, DescriptionEditor, RelatedAnnotationEditor } from "@/components-business/form-editor"
import { useTagDetailPane } from "@/services/main/tag"

const { data, addressInfo, isRootNode, setName, setType, setGroup, setAnnotations, setDescription } = useTagDetailPane()

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
    </template>
</template>
