<script setup lang="ts">
import { toRef } from "vue"
import { FormEditKit } from "@/components/interaction"
import { Input } from "@/components/form"
import { Separator, Icon, Starlight } from "@/components/universal"
import { TitleDisplay, DescriptionDisplay, TimeGroupDisplay, MetaTagListDisplay } from "@/components-business/form-display"
import { DescriptionEditor } from "@/components-business/form-editor"
import { DetailBook } from "@/functions/http-client/api/book"
import { useSideBarDetailInfo } from "@/services/main/book"

const props = defineProps<{book: DetailBook | null}>()

const data = toRef(props, "book")

const { setTitle, setScore, setDescription, openMetaTagEditor } = useSideBarDetailInfo(data)

</script>

<template>
    <template v-if="!!data">
        <p class="my-1">
            <Icon icon="id-card"/><b class="ml-1 selectable">{{data.id}}</b>
            <span class="float-right"><Icon class="mr-1" icon="images"/>{{ data.imageCount }}项</span>
        </p>
        <Separator direction="horizontal"/>
        <FormEditKit class="mt-2" :value="data.title" :set-value="setTitle">
            <template #default="{ value }">
                <TitleDisplay :value="value"/>
            </template>
            <template #edit="{ value, setValue, save }">
                <Input auto-focus :value="value" @update:value="setValue" @enter="save"/>
            </template>
        </FormEditKit>
        <Starlight class="is-inline-block mt-4" editable :value="data.score" @update:value="setScore"/>
        <FormEditKit class="mt-2" :value="data.description" :set-value="setDescription">
            <template #default="{ value }">
                <DescriptionDisplay :value="value"/>
            </template>
            <template #edit="{ value, setValue }">
                <DescriptionEditor :value="value" @update:value="setValue"/>
            </template>
        </FormEditKit>
        <MetaTagListDisplay class="mt-2" :topics="data.topics" :authors="data.authors" :tags="data.tags" @dblclick="openMetaTagEditor"/>
        <TimeGroupDisplay class="mt-2" :update-time="data.updateTime" :create-time="data.createTime"/>
    </template>
</template>
