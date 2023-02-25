<script setup lang="ts">
import { ThumbnailImage } from "@/components/universal"
import { FormEditKit } from "@/components/interaction"
import {
    SourceInfo, TitleDisplay, DescriptionDisplay, TimeGroupDisplay,
    SourceTagsDisplay, SourceBooksDisplay, SourceRelationsDisplay, SourceEditStatusDisplay
} from "@/components-business/form-display"
import { SourceEditStatusEditor } from "@/components-business/form-editor"
import { useSourceDataDetailPane } from "@/services/main/source-data"

const { data, relatedImages, setSourceEditStatus, gotoIllust } = useSourceDataDetailPane()

</script>

<template>
    <template v-if="data !== null">
        <SourceInfo class="mb-2" :source-id="data.sourceId" :site="data.sourceSite" :source-part="null"/>
        <template v-if="relatedImages?.length">
            <ThumbnailImage :file="relatedImages[0].thumbnailFile" min-height="12rem" max-height="40rem"/>
            <p class="w-100 has-text-right">
                <a class="no-wrap" @click="gotoIllust">
                    {{relatedImages.length > 1 ? `在图库查看全部的${relatedImages.length}个项目` : '在图库查看此项目'}}
                </a>
            </p>
        </template>
        <template v-else>
            <ThumbnailImage :file="null" min-height="12rem" max-height="40rem"/>
            <p class="w-100 has-text-right">
                <i class="no-wrap secondary-text">没有与此关联的图库项目</i>
            </p>
        </template>
        <FormEditKit class="my-2" :value="data.status" :set-value="setSourceEditStatus">
            <template #default="{ value }">
                <SourceEditStatusDisplay :value="value"/>
            </template>
            <template #edit="{ value, setValue }">
                <SourceEditStatusEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>
        <TitleDisplay :value="data.title"/>
        <DescriptionDisplay :value="data.description"/>
        <SourceRelationsDisplay :value="data.relations"/>
        <SourceBooksDisplay :value="data.books"/>
        <SourceTagsDisplay :value="data.tags"/>
        <TimeGroupDisplay class="mt-1" :create-time="data.createTime" :update-time="data.updateTime"/>
    </template>
</template>

<style module lang="sass">

</style>
