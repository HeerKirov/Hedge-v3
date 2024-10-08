<script setup lang="ts">
import { ref } from "vue"
import { Input } from "@/components/form"
import { Block, Button } from "@/components/universal"
import { FormEditKit } from "@/components/interaction"
import { Site } from "@/functions/http-client/api/setting"

const props = defineProps<{
    sourceLinkRules: Site["sourceLinkRules"]
    editable: boolean
}>()

const emit = defineEmits<{
    (e: "update:sourceLinkRules", value: Site["sourceLinkRules"]): void
}>()

const update = (newValue: string, index: number) => {
    emit("update:sourceLinkRules", [...props.sourceLinkRules.slice(0, index), newValue, ...props.sourceLinkRules.slice(index + 1)])
}

const remove = (index: number) => {
    emit("update:sourceLinkRules", [...props.sourceLinkRules.slice(0, index), ...props.sourceLinkRules.slice(index + 1)])
}

const add = () => {
    if(addMode.value && addText.value.trim()) {
        const existIndex = props.sourceLinkRules.indexOf(addText.value.trim())
        if(existIndex < 0) {
            emit("update:sourceLinkRules", [...props.sourceLinkRules, addText.value.trim()])
        }
        addText.value = ""
    }
}

const addMode = ref(false)
const addText = ref<string>("")

</script>

<template>
    <div class="flex column gap-1">
        <FormEditKit v-for="(item, idx) in sourceLinkRules" :key="item" :value="item" @update:value="update($event, idx)" :editable="editable">
            <template #default="{ value }">
                <Block mode="transparent" :class="$style['tag-block']">
                    {{value}}
                </Block>
            </template>
            <template #edit="{ value, setValue, save }">
                <Input size="small" width="half" placeholder="链接" :value="value" @update:value="setValue" update-on-input @enter="save"/>
                <Button class="ml-1" square size="small" type="danger" icon="trash" @click="remove(idx)"/>
            </template>
        </FormEditKit>
        <Button v-if="editable && !addMode" size="small" type="success" icon="plus" @click="addMode = true">添加链接</Button>
        <div v-else-if="editable" class="flex gap-1">
            <Input size="small" width="fullwidth" placeholder="链接" v-model:value="addText" @enter="add" update-on-input auto-focus/>
            <Button class="flex-item no-grow-shrink" square size="small" type="success" icon="check" @click="add"/>
        </div>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/size"

.tag-block
    padding: 0 $spacing-2
    line-height: #{$element-height-small - 2px}
    overflow-x: auto
    overflow-y: hidden
    &::-webkit-scrollbar
        display: none
</style>
