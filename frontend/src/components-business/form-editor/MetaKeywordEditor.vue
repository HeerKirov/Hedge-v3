<script setup lang="ts">
import { ref } from "vue"
import { Tag } from "@/components/universal"
import { SuggestInput } from "@/components/form"
import { HttpClient } from "@/functions/http-client"
import { MetaType } from "@/functions/http-client/api/all"
import { KeywordInfo } from "@/functions/http-client/api/util-picker"

const props = defineProps<{
    value: string[]
    metaType: MetaType
    autoFocus?: boolean
}>()

const emit = defineEmits<{
    (e: "update:value", value: string[]): void
}>()

const query = (client: HttpClient) => (search: string | undefined) => client.searchUtil.history.metaKeywords({tagType: props.metaType, search})

const mapOption = (item: KeywordInfo) => item.keyword

const inputText = ref<string>()

const enter = () => {
    if(inputText.value) {
        const idx = props.value.indexOf(inputText.value)
        if(idx >= 0) emit("update:value", [...props.value.slice(0, idx), ...props.value.slice(idx + 1), inputText.value])
        else emit("update:value", [...props.value, inputText.value])
        inputText.value = undefined
    }
}

const removeItem = (idx: number) => {
    emit("update:value", [...props.value.slice(0, idx), ...props.value.slice(idx + 1)])
}

</script>

<template>
    <div class="flex gap-half multiline align-center">
        <span v-for="(item, idx) in value">
            <Tag brackets="[]" line-style="none">{{ item }}</Tag>
            <Tag icon="close" line-style="none" clickable @click="removeItem(idx)"/>
        </span>
        <SuggestInput v-model:value="inputText" size="small" :query :mapOption placeholder="添加关键词" :auto-focus="autoFocus" update-on-input @enter="enter"/>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.popup
    max-width: 450px
    min-width: 200px
    padding: size.$spacing-2
</style>
