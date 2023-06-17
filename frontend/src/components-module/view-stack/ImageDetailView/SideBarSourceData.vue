<script setup lang="ts">
import { Separator } from "@/components/universal"
import { FormEditKit } from "@/components/interaction"
import {
    SourceInfo, SourceEditStatusDisplay, TitleDisplay, DescriptionDisplay,
    SourceRelationsDisplay, SourceBooksDisplay, SourceTagsDisplay
} from "@/components-business/form-display"
import { SourceIdentityEditor, SourceEditStatusEditor } from "@/components-business/form-editor"
import { useSideBarSourceData } from "@/services/view-stack/image"

const { data, sourceIdentity, setSourceStatus, setSourceIdentity, openSourceDataEditor } = useSideBarSourceData()

</script>

<template>
    <template v-if="data !== null">
        <FormEditKit class="mb-2" :value="sourceIdentity!" :set-value="setSourceIdentity">
            <template #default="{ value }">
                <SourceInfo :source-id="value.sourceId" :source-part="value.sourcePart" :site="value.site"/>
            </template>
            <template #edit="{ value, setValue }">
                <SourceIdentityEditor :source-id="value.sourceId" :source-part="value.sourcePart" :site="value.site" @update="setValue"/>
            </template>
        </FormEditKit>
        <FormEditKit class="mb-2" :value="data.status" :set-value="setSourceStatus">
            <template #default="{ value }">
                <SourceEditStatusDisplay :value="value"/>
            </template>
            <template #edit="{ value, setValue }">
                <SourceEditStatusEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>
        <template v-if="data.sourceSite !== null">
            <Separator direction="horizontal"/>
            <TitleDisplay :value="data.title" @dblclick="openSourceDataEditor"/>
            <DescriptionDisplay :value="data.description" @dblclick="openSourceDataEditor"/>
            <SourceRelationsDisplay :value="data.relations" @dblclick="openSourceDataEditor"/>
            <SourceBooksDisplay :value="data.books" @dblclick="openSourceDataEditor"/>
            <SourceTagsDisplay :value="data.tags" @dblclick="openSourceDataEditor"/>
        </template>
    </template>
</template>

<style module lang="sass">

</style>
