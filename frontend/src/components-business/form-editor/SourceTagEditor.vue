<script setup lang="ts">
import { ref, watch } from "vue"
import { Group, Flex, FlexItem } from "@/components/layout"
import { Button, Tag, Block } from "@/components/universal"
import { Input } from "@/components/form"
import { SourceTagElement } from "@/components-business/element"
import { SourceTag } from "@/functions/http-client/api/source-data"
import { useMessageBox } from "@/modules/message-box"

const props = defineProps<{
    value: SourceTag[]
}>()

const emit = defineEmits<{
    (e: "update:value", value: SourceTag[]): void
}>()

const message = useMessageBox()

const selected = ref<{mode: "create"} | {mode: "edit", index: number} | {mode: "close"}>({mode: "close"})

const form = ref<SourceTag | null>(null)

watch(selected, () => {
    if(selected.value.mode === "create") {
        form.value = {code: "", name: "", otherName: "", type: ""}
    }else if(selected.value.mode === "edit") {
        form.value = props.value[selected.value.index] ?? null
    }else{
        form.value = null
    }
})

watch(() => props.value, values => {
    if(selected.value.mode === "edit") {
        form.value = values[selected.value.index] ?? null
    }
})

const create = () => selected.value = {mode: "create"}

const edit = (index: number) => selected.value = {mode: "edit", index}

const deleteItem = () => {
    if(selected.value.mode === "edit") {
        const index = selected.value.index
        selected.value = {mode: "close"}
        emit("update:value", [...props.value.slice(0, index), ...props.value.slice(index + 1)])
    }
}

const updateEditItem = (item: SourceTag) => {
    if(selected.value.mode === "edit") {
        emit("update:value", [...props.value.slice(0, selected.value.index), item, ...props.value.slice(selected.value.index + 1)])
    }
}

const setCode = (code: string) => {
    if(selected.value.mode === "create") {
        if(code) {
            //tag editor的创建逻辑是隐性实现的。
            //当在新建模式填充了code后，一旦失去焦点(触发setCode)，就会立刻将当前create表单创建为一个新的项并存储。
            //code为空时，则暂时搁置创建。
            if(props.value.find(t => t.code === code)) {
                message.showOkMessage("prompt", "该标识编码已存在。", "在同一列表中创建了重名的标签。")
                return
            }
            form.value!.code = code
            selected.value = {mode: "edit", index: props.value.length}
            emit("update:value", [...props.value, form.value!])
        }
    }else if(selected.value.mode === "edit") {
        const index = selected.value.index
        if(props.value.find((t, i) => t.code === code && index === i)) {
            message.showOkMessage("prompt", "该标识编码已存在。", "在同一列表中创建了重名的标签。")
            return
        }
        updateEditItem({...form.value!, code})
    }
}

const setType = (type: string) => {
    if(selected.value.mode === "create") {
        form.value!.type = type
    }else if(selected.value.mode === "edit") {
        updateEditItem({...form.value!, type})
    }
}

const setName = (name: string) => {
    if(selected.value.mode === "create") {
        form.value!.name = name
    }else if(selected.value.mode === "edit") {
        updateEditItem({...form.value!, name})
    }
}

const setOtherName = (otherName: string) => {
    if(selected.value.mode === "create") {
        form.value!.otherName = otherName
    }else if(selected.value.mode === "edit") {
        updateEditItem({...form.value!, otherName})
    }
}

</script>

<template>
    <Flex :class="$style.root">
        <FlexItem :width="100">
            <Group class="p-1">
                <SourceTagElement v-for="(tag, idx) in value" :value="tag" clickable @click="edit(idx)"/>
                <Tag color="success" icon="plus" clickable @click="create">新标签</Tag>
            </Group>
        </FlexItem>
        <FlexItem v-if="form !== null" :width="60">
            <Block class="p-2">
                <Flex class="mb-1" :spacing="1">
                    <FlexItem :width="60">
                        <Input size="small" placeholder="标识编码" :value="form.code" @update:value="setCode" auto-focus/>
                    </FlexItem>
                    <FlexItem :width="40">
                        <Input size="small" placeholder="分类" :value="form.type" @update:value="setType"/>
                    </FlexItem>
                    <FlexItem v-if="selected.mode === 'edit'" :shrink="0">
                        <Button size="small" square mode="light" type="danger" icon="trash" @click="deleteItem"/>
                    </FlexItem>
                </Flex>
                <Input class="mb-1" size="small" width="fullwidth" placeholder="显示名称" :value="form.name" @update:value="setName"/>
                <Input class="mb-1" size="small" width="fullwidth" placeholder="别名" :value="form.otherName" @update:value="setOtherName"/>
            </Block>
        </FlexItem>
    </Flex>
</template>

<style module lang="sass">
.root
    min-height: 2rem
</style>
