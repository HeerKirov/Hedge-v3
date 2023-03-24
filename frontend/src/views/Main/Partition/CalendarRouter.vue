<script setup lang="ts">
import { reactive, ref, watch } from "vue"
import { Button } from "@/components/universal"
import { NumberInput } from "@/components/form"
import { Group } from "@/components/layout"
import { useInterceptedKey } from "@/modules/keyboard"

const props = defineProps<{
    value: {year: number, month: number}
}>()

const emit = defineEmits<{
    (e: "update:value", value: {year: number, month: number}): void
}>()

const editMode = ref(false)
const editValue = reactive({year: 0, month: 0})

const edit = () => {
    editValue.year = props.value.year
    editValue.month = props.value.month
    editMode.value = true
}
const save = () => {
    if(editValue.year !== props.value.year || editValue.month !== props.value.month) {
        emit("update:value", {...editValue})
    }
    editMode.value = false
}

const prev = () => {
    if(props.value.month <= 1) {
        emit("update:value", {year: props.value.year - 1, month: 12})
    }else{
        emit("update:value", {year: props.value.year, month: props.value.month - 1})
    }
}
const next = () => {
    if(props.value.month >= 12) {
        emit("update:value", {year: props.value.year + 1, month: 1})
    }else{
        emit("update:value", {year: props.value.year, month: props.value.month + 1})
    }
}

watch(() => props.value, date => {
    if(editMode.value) {
        editValue.year = date.year
        editValue.month = date.month
    }
})

useInterceptedKey(["ArrowUp", "ArrowLeft"], prev)
useInterceptedKey(["ArrowDown", "ArrowRight"], next)

</script>

<template>
    <Group v-if="editMode" class="is-line-height-std" single-line>
        <NumberInput class="mr-1" :min="1995" :max="2077" v-model:value="editValue.year"/>年
        <NumberInput class="mr-1" width="one-third" :min="1" :max="12" v-model:value="editValue.month"/>月
        <Button square icon="check" @click="save"/>
    </Group>
    <Group v-else single-line>
        <Button square icon="angle-left" @click="prev"/>
        <Button @click="edit"><b>{{value.year}}</b>年<b>{{value.month}}月</b></Button>
        <Button square icon="angle-right" @click="next"/>
    </Group>
</template>
