<script setup lang="ts">
import { Button, Icon } from "@/components/universal"
import { TagmeEditor } from "@/components-business/form-editor"
import { META_TYPE_ICONS } from "@/constants/entity"
import { useEditorContext } from "./context"
import { CheckBox } from "@/components/form";

defineProps<{
    allowTagme: boolean
}>()

const { identity, typeFilter, tab, tabDBType, form: { tagme, setTagme, overwriteMode } } = useEditorContext()

const clickAuthorFilter = () => {
    if(typeFilter.value.author && !typeFilter.value.tag && !typeFilter.value.topic) {
        typeFilter.value = {author: true, tag: true, topic: true}
    }else{
        typeFilter.value = {author: true, tag: false, topic: false}
        if(tab.value === "db") tabDBType.value = "author"
    }
}

const clickTopicFilter = () => {
    if(!typeFilter.value.author && !typeFilter.value.tag && typeFilter.value.topic) {
        typeFilter.value = {author: true, tag: true, topic: true}
    }else{
        typeFilter.value = {author: false, tag: false, topic: true}
        if(tab.value === "db") tabDBType.value = "topic"
    }
}

const clickTagFilter = () => {
    if(!typeFilter.value.author && typeFilter.value.tag && !typeFilter.value.topic) {
        typeFilter.value = {author: true, tag: true, topic: true}
    }else{
        typeFilter.value = {author: false, tag: true, topic: false}
        if(tab.value === "db") tabDBType.value = "tag"
    }
}

</script>

<template>
    <Button class="mr-1" :type="typeFilter.author ? 'primary' : 'secondary'" @click="clickAuthorFilter" @contextmenu="typeFilter.author = !typeFilter.author">
        <Icon :icon="META_TYPE_ICONS['AUTHOR']"/>作者
    </Button>
    <Button class="mr-1" :type="typeFilter.topic ? 'primary' : 'secondary'" @click="clickTopicFilter" @contextmenu="typeFilter.topic = !typeFilter.topic">
        <Icon :icon="META_TYPE_ICONS['TOPIC']"/>主题
    </Button>
    <Button :type="typeFilter.tag ? 'primary' : 'secondary'" @click="clickTagFilter" @contextmenu="typeFilter.tag = !typeFilter.tag">
        <Icon :icon="META_TYPE_ICONS['TAG']"/>标签
    </Button>
    <CheckBox v-if="identity?.type === 'ILLUST_LIST'" class="mx-2" v-model:value="overwriteMode">覆盖原有标签</CheckBox>
    <TagmeEditor v-if="allowTagme" class="float-right" direction="horizontal" :value="tagme" @update:value="setTagme"/>
</template>
