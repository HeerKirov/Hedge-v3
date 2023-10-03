<script setup lang="ts">
import { ThumbnailImage, Icon, Separator } from "@/components/universal"
import { FormEditKit } from "@/components/interaction"
import { BasePane } from "@/components/layout"
import {
    SourceInfo, TitleDisplay, DescriptionDisplay, TimeGroupDisplay, SourceAdditionalInfoDisplay,
    SourceTagsDisplay, SourceBooksDisplay, SourceRelationsDisplay, SourceEditStatusDisplay, SourceLinksDisplay
} from "@/components-business/form-display"
import { SourceEditStatusEditor } from "@/components-business/form-editor"
import { useSourceDataDetailPane } from "@/services/main/source-data"

defineEmits<{
    (e: "close"): void
}>()

const { data, sourceDataPath, relatedImages, setSourceEditStatus, gotoIllust, openEditDialog } = useSourceDataDetailPane()

</script>

<template>
    <BasePane @close="$emit('close')">
        <template #top>
            <ThumbnailImage :file="relatedImages?.length ? relatedImages[0].filePath.thumbnail : null" :aspect="1"/>
            <p class="w-100 has-text-right">
                <a v-if="relatedImages?.length" class="no-wrap" @click="gotoIllust">
                    {{relatedImages.length > 1 ? `在图库查看全部的${relatedImages.length}个项目` : '在图库查看此项目'}}
                    <Icon icon="angle-double-right"/>
                </a>
                <i v-else class="no-wrap secondary-text">没有与此关联的图库项目</i>
            </p>
        </template>

        <template v-if="data !== null">
            <SourceInfo class="my-1" :source="sourceDataPath"/>
            <Separator direction="horizontal"/>
            <a class="float-right is-font-size-small mt-1" @click="openEditDialog"><Icon class="mr-1" icon="edit"/>编辑</a>
            <FormEditKit class="is-line-height-std my-2" :value="data.status" :set-value="setSourceEditStatus" save-once-updated>
                <template #default="{ value }">
                    <SourceEditStatusDisplay :value="value"/>
                </template>
                <template #edit="{ value, setValue }">
                    <SourceEditStatusEditor :value="value" @update:value="setValue"/>
                </template>
            </FormEditKit>
            <TitleDisplay v-if="data.title" :value="data.title" @dblclick="openEditDialog"/>
            <DescriptionDisplay v-if="data.description" :value="data.description" @dblclick="openEditDialog"/>
            <SourceRelationsDisplay v-if="data.relations.length" :value="data.relations" @dblclick="openEditDialog"/>
            <SourceBooksDisplay v-if="data.books.length" :value="data.books" @dblclick="openEditDialog"/>
            <SourceTagsDisplay v-if="data.tags.length" :site="data.sourceSite" :value="data.tags" @dblclick="openEditDialog"/>
            <SourceLinksDisplay v-if="data.links.length" :value="data.links" @dblclick="openEditDialog"/>
            <SourceAdditionalInfoDisplay v-if="data.additionalInfo.length" :value="data.additionalInfo" @dblclick="openEditDialog"/>
            <TimeGroupDisplay class="mt-1" :create-time="data.createTime" :update-time="data.updateTime"/>
        </template>
    </BasePane>
</template>

<style module lang="sass">

</style>
