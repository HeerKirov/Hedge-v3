<script setup lang="ts">
import { ref } from "vue"
import { Button } from "@/components/universal"
import { Input } from "@/components/form"
import { Flex, FlexItem } from "@/components/layout"
import { SourceBook } from "@/functions/http-client/api/source-data"

const props = defineProps<{
    value: SourceBook[]
}>()

const emit = defineEmits<{
    (e: "update:value", value: SourceBook[]): void
}>()

const showNewLine = ref(false)

const setCode = (index: number | "create", code: string) => {
    if(index === "create") {
        emit("update:value", [...props.value, {code, title: "", otherTitle: ""}])
        showNewLine.value = false
    }else{
        const cur = props.value[index]
        emit("update:value", [...props.value.slice(0, index), {...cur, code}, ...props.value.slice(index + 1)])
    }
}

const setTitle = (index: number | "create", title: string) => {
    if(index === "create") {
        emit("update:value", [...props.value, {code: "", title, otherTitle: ""}])
        showNewLine.value = false
    }else{
        const cur = props.value[index]
        emit("update:value", [...props.value.slice(0, index), {...cur, title}, ...props.value.slice(index + 1)])
    }
}

const setOtherTitle = (index: number, otherTitle: string) => {
    const cur = props.value[index]
    emit("update:value", [...props.value.slice(0, index), {...cur, otherTitle}, ...props.value.slice(index + 1)])
}

const deleteItem = (index: number) => {
    emit("update:value", [...props.value.slice(0, index), ...props.value.slice(index + 1)])
}

</script>

<template>
    <div class="p-1">
        <Flex v-for="(book, idx) in value" class="mb-1" :spacing="1">
            <FlexItem :width="20">
                <Input size="small" placeholder="标识编码" :value="book.code" @update:value="setCode(idx, $event)"/>
            </FlexItem>
            <!-- TODO 此处也使用了动态的Flex参数，它们是无法生效的 -->
            <FlexItem :width="book.otherTitle?.length ? 40 : 60">
                <Input size="small" placeholder="标题" :value="book.title" @update:value="setTitle(idx, $event)"/>
            </FlexItem>
            <FlexItem :width="book.otherTitle?.length ? 40 : 20">
                <Input size="small" placeholder="其他标题" :value="book.otherTitle" @update:value="setOtherTitle(idx, $event)"/>
            </FlexItem>
            <FlexItem :shrink="0">
                <Button size="small" square type="danger" icon="close" @click="deleteItem(idx)"/>
            </FlexItem>
        </Flex>
        <Flex v-if="showNewLine" class="mb-1" :spacing="1">
            <FlexItem :width="20">
                <Input size="small" placeholder="标识编码" @update:value="setCode('create', $event)"/>
            </FlexItem>
            <FlexItem :width="80">
                <Input size="small" placeholder="标题" @update:value="setTitle('create', $event)"/>
            </FlexItem>
        </Flex>
        <Button class="w-100" size="small" type="success" icon="plus" @click="showNewLine = true">新集合</Button>
    </div>
</template>
