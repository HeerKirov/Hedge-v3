<script setup lang="ts">
import { toRef } from "vue"
import { Separator, Icon } from "@/components/universal"
import { FormEditKit } from "@/components/interaction"
import {
    SourceInfo, SourceEditStatusDisplay, TitleDisplay, DescriptionDisplay, TimeGroupDisplay,
    SourceRelationsDisplay, SourceBooksDisplay, SourceTagsDisplay, SourceLinksDisplay, SourceAdditionalInfoDisplay
} from "@/components-business/form-display"
import { SourceIdentityEditor, SourceEditStatusEditor } from "@/components-business/form-editor"
import { useSideBarSourceData } from "@/services/main/illust"

const props = defineProps<{detailId: number, type: "IMAGE" | "COLLECTION"}>()

const emit = defineEmits<{
    (e: "backTab"): void
}>()

const detailId = toRef(props, "detailId")

const { data, sourceDataPath, setSourceStatus, setSourceDataPath, openSourceDataEditor } = useSideBarSourceData(detailId, () => emit("backTab"))

</script>

<template>
    <p class="mt-1 mb-1 is-cursor-pointer" @click="$emit('backTab')">
        <a class="mr-1"><Icon icon="angle-left"/></a>
        <Icon icon="id-card"/><b class="ml-1 selectable">{{detailId}}</b>
    </p>
    <Separator direction="horizontal" :spacing="[1, 2]"/>
    <template v-if="data !== null">
        <FormEditKit class="my-1" :value="sourceDataPath!" :set-value="setSourceDataPath">
            <template #default="{ value }">
                <SourceInfo :source="value"/>
            </template>
            <template #edit="{ value, setValue, save }">
                <SourceIdentityEditor :source="value" @update:source="setValue" @enter="save"/>
            </template>
        </FormEditKit>
        <Separator direction="horizontal" :spacing="2"/>
        <FormEditKit v-if="!!sourceDataPath" class="mb-2" :value="data.status" :set-value="setSourceStatus" save-once-updated>
            <template #default="{ value }">
                <a class="float-right" @click="openSourceDataEditor"><Icon icon="edit"/>编辑</a>
                <SourceEditStatusDisplay :value="value"/>
            </template>
            <template #edit="{ value, setValue }">
                <a class="float-right" @click="openSourceDataEditor"><Icon icon="edit"/>编辑</a>
                <SourceEditStatusEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>
        <template v-if="data.source !== null">
            <TitleDisplay v-if="data.title" :value="data.title" @dblclick="openSourceDataEditor"/>
            <DescriptionDisplay v-if="data.description" :value="data.description" @dblclick="openSourceDataEditor"/>
            <SourceRelationsDisplay v-if="data.relations.length" :value="data.relations" @dblclick="openSourceDataEditor"/>
            <SourceBooksDisplay v-if="data.books.length" :value="data.books" @dblclick="openSourceDataEditor"/>
            <SourceTagsDisplay v-if="data.tags.length" :site="data.source.sourceSite" :value="data.tags" @dblclick="openSourceDataEditor"/>
            <SourceLinksDisplay v-if="data.links.length" :value="data.links" @dblclick="openSourceDataEditor"/>
            <SourceAdditionalInfoDisplay v-if="data.additionalInfo.length" :value="data.additionalInfo" @dblclick="openSourceDataEditor"/>
            <TimeGroupDisplay v-if="data.publishTime" class="mt-1" :publish-time="data.publishTime"/>
        </template>
    </template>
    <div v-else-if="type === 'COLLECTION'" class="has-text-centered">
        <i class="has-text-secondary">集合没有来源数据</i>
    </div>
</template>
