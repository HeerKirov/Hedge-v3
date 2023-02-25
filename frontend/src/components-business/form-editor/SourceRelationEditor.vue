<script setup lang="ts">
import { ref } from "vue"
import { Button } from "@/components/universal"
import { NumberInput } from "@/components/form"
import { Flex, FlexItem } from "@/components/layout"

const props = defineProps<{
    value: number[]
}>()

const emit = defineEmits<{
    (e: "update:value", value: number[]): void
}>()

const showNewLine = ref(false)

const setValue = (index: number | "create", v: number) => {
    if(index === "create") {
        emit("update:value", [...props.value, v])
        showNewLine.value = false
    }else{
        emit("update:value", [...props.value.slice(0, index), v, ...props.value.slice(index + 1)])
    }
}

const deleteItem = (index: number) => {
    emit("update:value", [...props.value.slice(0, index), ...props.value.slice(index + 1)])
}

</script>

<template>
    <div class="p-1">
        <Flex v-for="(v, idx) in value" class="mb-1" :spacing="1">
            <FlexItem :width="100">
                <NumberInput size="small" placeholder="关联项ID" :value="v" @update:value="setValue(idx, $event)"/>
            </FlexItem>
            <FlexItem :shrink="0">
                <Button size="small" square mode="light" type="danger" icon="close" @click="deleteItem(idx)"/>
            </FlexItem>
        </Flex>
        <Flex v-if="showNewLine" class="mb-1" :spacing="1">
            <FlexItem :width="100">
                <NumberInput size="small" width="fullwidth" placeholder="关联项ID" @update:value="setValue('create', $event)"/>
            </FlexItem>
        </Flex>
        <Button class="w-100" size="small" type="success" icon="plus" @click="showNewLine = true">新关联项</Button>
    </div>
</template>
