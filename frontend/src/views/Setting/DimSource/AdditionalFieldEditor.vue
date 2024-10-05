<script setup lang="ts">
import { ref } from "vue"
import { Input } from "@/components/form"
import { Block, Button } from "@/components/universal"
import { FormEditKit } from "@/components/interaction"
import { Site } from "@/functions/http-client/api/setting"

const props = defineProps<{
    additionalInfo: Site["additionalInfo"]
    editable: boolean
}>()

const emit = defineEmits<{
    (e: "update:additionalInfo", value: Site["additionalInfo"]): void
}>()

const update = (newValue: Site["additionalInfo"][number], index: number) => {
    emit("update:additionalInfo", [...props.additionalInfo.slice(0, index), newValue, ...props.additionalInfo.slice(index + 1)])
}

const remove = (index: number) => {
    emit("update:additionalInfo", [...props.additionalInfo.slice(0, index), ...props.additionalInfo.slice(index + 1)])
}

const add = () => {
    if(addMode.value && (addForm.value.field.trim() || addForm.value.label.trim())) {
        emit("update:additionalInfo", [...props.additionalInfo, {field: addForm.value.field.trim() || addForm.value.label.trim(), label: addForm.value.label.trim() || addForm.value.field.trim() || addForm.value.label.trim()}])
        addForm.value = {label: "", field: ""}
    }
}

const addMode = ref(false)
const addForm = ref<Site["additionalInfo"][number]>({label: "", field: ""})

</script>

<template>
    <div class="flex wrap gap-1 align-center">
        <FormEditKit v-for="(item, idx) in additionalInfo" :key="item.field" :value="item" @update:value="update($event, idx)" :editable="editable">
            <template #default="{ value }">
                <Block :class="$style['tag-block']">
                    <span class="secondary-text">{{value.field}}</span>
                    {{value.label}}
                </Block>
            </template>
            <template #edit="{ value, setValue, save }">
                <Input size="small" width="half" placeholder="字段名" :value="value.field" @update:value="setValue({...value, field: $event})" update-on-input @enter="save"/>
                <Input size="small" width="half" placeholder="显示名" v-model:value="value.label" @update:value="setValue({...value, label: $event})" update-on-input @enter="save"/>
                <Button class="ml-1" square size="small" type="danger" icon="trash" @click="remove(idx)"/>
            </template>
        </FormEditKit>
        <Button v-if="editable && !addMode" square size="small" type="success" icon="plus" @click="addMode = true"/>
        <div v-else-if="editable">
            <Input size="small" width="half" placeholder="字段名" v-model:value="addForm.field" @enter="add" update-on-input auto-focus/>
            <Input size="small" width="half" placeholder="显示名" v-model:value="addForm.label" @enter="add" update-on-input/>
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
