<script setup lang="ts">
import { ThumbnailImage, Icon, Separator } from "@/components/universal"
import { FormEditKit } from "@/components/interaction"
import {
    SourceInfo, TitleDisplay, DescriptionDisplay, TimeGroupDisplay, SourceAdditionalInfoDisplay,
    SourceTagsDisplay, SourceBooksDisplay, SourceRelationsDisplay, SourceEditStatusDisplay, SourceLinksDisplay
} from "@/components-business/form-display"
import { SourceEditStatusEditor } from "@/components-business/form-editor"
import { useSourceDataDetailPane } from "@/services/main/source-data"

const { data, sourceDataPath, relatedImages, setSourceEditStatus, gotoIllust, openEditDialog } = useSourceDataDetailPane()

</script>

<template>
    <template v-if="data !== null">
        <SourceInfo class="mb-2" :source="sourceDataPath"/>
        <template v-if="relatedImages?.length">
            <ThumbnailImage :file="relatedImages[0].filePath.thumbnail" min-height="12rem" max-height="40rem"/>
            <p class="w-100 has-text-right">
                <a class="no-wrap" @click="gotoIllust">
                    {{relatedImages.length > 1 ? `在图库查看全部的${relatedImages.length}个项目` : '在图库查看此项目'}}
                    <Icon icon="angle-double-right"/>
                </a>
            </p>
        </template>
        <template v-else>
            <ThumbnailImage :file="null" min-height="12rem" max-height="40rem"/>
            <p class="w-100 has-text-right">
                <i class="no-wrap secondary-text">没有与此关联的图库项目</i>
            </p>
        </template>
        <a class="float-right is-font-size-small mt-2" @click="openEditDialog"><Icon class="mr-1" icon="edit"/>编辑</a>
        <FormEditKit class="is-line-height-std mt-2" :value="data.status" :set-value="setSourceEditStatus" save-once-updated>
            <template #default="{ value }">
                <SourceEditStatusDisplay :value="value"/>
            </template>
            <template #edit="{ value, setValue }">
                <SourceEditStatusEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>
        <Separator direction="horizontal"/>
        <TitleDisplay v-if="data.title" :value="data.title"/>
        <DescriptionDisplay v-if="data.description" :value="data.description"/>
        <SourceRelationsDisplay v-if="data.relations.length" :value="data.relations"/>
        <SourceBooksDisplay v-if="data.books.length" :value="data.books"/>
        <SourceTagsDisplay v-if="data.tags.length" :value="data.tags"/>
        <SourceLinksDisplay v-if="data.links.length" :value="data.links"/>
        <SourceAdditionalInfoDisplay v-if="data.additionalInfo.length" :value="data.additionalInfo"/>
        <TimeGroupDisplay class="mt-1" :create-time="data.createTime" :update-time="data.updateTime"/>
    </template>
</template>

<style module lang="sass">

</style>
