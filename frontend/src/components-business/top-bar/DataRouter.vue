<script setup lang="ts">
import { ref } from "vue"
import { Tag } from "@/components/universal"
import { NumberInput } from "@/components/form"

const props = defineProps<{
    state: {total: number, offset: number, limit: number} | null
}>()

const emit = defineEmits<{
    (e: "navigate", offset: number): void
}>()

const editMode = ref(false)
const editValue = ref(1)

const edit = () => {
    editValue.value = (props.state?.offset ?? 0) + 1
    editMode.value = true
}

const submit = () => {
    const offset = editValue.value - 1
    const navigateValue = offset < 0 ? 0 : props.state !== null && offset >= props.state.total ? props.state.total - 1 : offset
    emit("navigate", navigateValue)
    editMode.value = false
}

</script>

<template>
    <div :class="$style.root">
        <NumberInput v-if="editMode" size="small" width="half" :min="1" v-model:value="editValue" auto-focus @enter="editMode = false" @blur="submit"/>
        <Tag v-else-if="state !== null && state.total > 0" class="is-cursor-text" @click="edit">{{state.offset + 1}}-{{state.offset + state.limit < state.total ? state.offset + state.limit : state.total}}</Tag>
        <Tag v-else>0-0</Tag>
        <span class="mx-1">/</span>
        <Tag>{{state?.total ?? 0}}</Tag>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.root
    margin: 0 size.$spacing-2
    display: flex
    align-items: center
    flex: 0 0 auto
</style>
