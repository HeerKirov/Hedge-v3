<script setup lang="ts">
import { Input } from "@/components/form"
import { Icon, Separator, Starlight } from "@/components/universal"
import { FormEditKit } from "@/components/interaction"
import { DescriptionEditor } from "@/components-business/form-editor"
import { DescriptionDisplay, MetaTagListDisplay, TimeGroupDisplay, TitleDisplay } from "@/components-business/form-display"
import { useBookViewContext } from "@/services/view-stack/book"

const { target: { data, id, setTitle, setScore, setDescription, openMetaTagEditor } } = useBookViewContext()

</script>

<template>
    <p class="mb-1">
        <Icon icon="id-card"/><b class="ml-1 is-font-size-large selectable">{{id}}</b>
    </p>
    <template v-if="data !== null">
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
