<script setup lang="ts">
import { ref } from "vue"
import { Input } from "@/components/form"
import { Block, Button } from "@/components/universal"
import { FormEditKit } from "@/components/interaction"
import { Site } from "@/functions/http-client/api/setting"

const props = defineProps<{
    tagTypes: Site["tagTypes"]
    editable: boolean
}>()

const emit = defineEmits<{
    (e: "update:tagTypes", value: Site["tagTypes"]): void
}>()

const update = (item: string, index: number) => {
    const existIndex = props.tagTypes.indexOf(item)
    if(existIndex >= 0 && existIndex !== index) {
        remove(existIndex)
    }else{
        emit("update:tagTypes", [...props.tagTypes.slice(0, index), item, ...props.tagTypes.slice(index + 1)])
    }
}

const remove = (index: number) => {
    emit("update:tagTypes", [...props.tagTypes.slice(0, index), ...props.tagTypes.slice(index + 1)])
}

const add = () => {
    if(addText.value.trim()) {
        const existIndex = props.tagTypes.indexOf(addText.value.trim())
        if(existIndex >= 0) {
            emit("update:tagTypes", [...props.tagTypes.slice(0, existIndex), ...props.tagTypes.slice(existIndex + 1), addText.value.trim()])
        }else{
            emit("update:tagTypes", [...props.tagTypes, addText.value.trim()])
        }
        addText.value = ""
    }
}

const addMode = ref(false)
const addText = ref("")

</script>

<template>
    <div class="flex multiline gap-1 align-center">
        <FormEditKit v-for="(item, idx) in tagTypes" :key="item" :value="item" @update:value="update($event, idx)" :editable="editable">
            <template #default="{ value }">
                <Block :class="$style['tag-block']">{{value}}</Block>
            </template>
            <template #edit="{ value, setValue, save }">
                <Input size="small" width="half" :value="value" @update:value="setValue" @enter="save" auto-focus update-on-input/>
                <Button class="ml-1" square size="small" type="danger" icon="trash" @click="remove(idx)"/>
            </template>
        </FormEditKit>
        <Button v-if="editable && !addMode" square size="small" type="success" icon="plus" @click="addMode = true"/>
        <div v-else-if="editable">
            <Input size="small" width="half" placeholder="添加类型" v-model:value="addText" @enter="add" update-on-input auto-focus/>
            <Button class="ml-1" square size="small" type="success" icon="check" @click="add"/>
        </div>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/size"

.tag-block
    padding: 0 $spacing-2
    line-height: #{$element-height-small - 2px}
</style>
