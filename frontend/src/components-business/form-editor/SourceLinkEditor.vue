<script setup lang="ts">
import { ref } from "vue"
import { Button } from "@/components/universal"
import { Input } from "@/components/form"
import { Flex, FlexItem } from "@/components/layout"

const props = defineProps<{
    value?: string[]
}>()

const emit = defineEmits<{
    (e: "update:value", value: string[]): void
}>()

const showNewLine = ref(false)

const remove = (idx: number) => {
    if(props.value) {
        emit("update:value", [...props.value.slice(0, idx), ...props.value.slice(idx + 1)])
    }
}

const set = (idx: number | "create", v: string) => {
    if(idx === "create") {
        emit("update:value", [...(props.value ?? []), v])
        showNewLine.value = false
    }else if(props.value) {
        emit("update:value", [...props.value.slice(0, idx), v, ...props.value.slice(idx + 1)])
    }
}

</script>

<template>
    <Flex v-for="(item, idx) in (value ?? [])" class="mt-1" :spacing="1">
        <FlexItem>
            <Input size="small" width="fullwidth" placeholder="https://" :value="item" @update:value="set(idx, $event)"/>
        </FlexItem>
        <FlexItem>
            <Button size="small" type="danger" icon="close" square @click="remove(idx)"/>
        </FlexItem>
    </Flex>
    <Flex v-if="showNewLine" class="mt-1" :spacing="1">
        <Input size="small" width="fullwidth" placeholder="https://" value="https://" @update:value="set('create', $event)"/>
    </Flex>
    <Button class="mt-1 w-100" size="small" type="success" icon="plus" @click="showNewLine = true">添加</Button>
</template>
