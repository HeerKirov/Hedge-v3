<script setup lang="ts">
import { toRef } from "vue"
import { FormEditKit } from "@/components/interaction"
import { Input } from "@/components/form"
import { Separator, Icon } from "@/components/universal"
import { TitleDisplay, DescriptionDisplay, TimeGroupDisplay, MetaTagListDisplay } from "@/components-business/form-display"
import { DescriptionEditor, FavoriteEditor, ScoreEditor } from "@/components-business/form-editor"
import { DetailBook } from "@/functions/http-client/api/book"
import { useSideBarDetailInfo } from "@/services/main/book"

const props = defineProps<{book: DetailBook | null}>()

const data = toRef(props, "book")

const { setTitle, setScore, setFavorite, setDescription, openMetaTagEditor } = useSideBarDetailInfo(data)

</script>

<template>
    <template v-if="!!data">
        <p class="my-1">
            <Icon icon="id-card"/><b class="ml-1 selectable">{{data.id}}</b>
            <span class="float-right"><Icon class="mr-1" icon="images"/>{{ data.imageCount }}个图像</span>
        </p>
        <Separator direction="horizontal"/>
        <FormEditKit :value="data.title" :set-value="setTitle">
            <template #default="{ value }">
                <TitleDisplay :value="value"/>
            </template>
            <template #edit="{ value, setValue, save }">
                <Input class="w-100" auto-focus :value="value" @update:value="setValue" @enter="save"/>
            </template>
        </FormEditKit>
        <div class="mt-1 flex jc-between">
            <ScoreEditor :value="data.score" @update:value="setScore"/>
            <FavoriteEditor :value="data.favorite" @update:value="setFavorite"/>
        </div>
        <FormEditKit class="mt-1" :value="data.description" :set-value="setDescription">
            <template #default="{ value }">
                <DescriptionDisplay :value="value"/>
            </template>
            <template #edit="{ value, setValue, save }">
                <DescriptionEditor :value="value" @update:value="setValue" enter-to-save @enter="save"/>
            </template>
        </FormEditKit>
        <TimeGroupDisplay class="mt-2" :update-time="data.updateTime" :create-time="data.createTime"/>
        <Separator direction="horizontal" :spacing="2"/>
        <MetaTagListDisplay :topics="data.topics" :authors="data.authors" :tags="data.tags" @dblclick="openMetaTagEditor"/>
    </template>
</template>
