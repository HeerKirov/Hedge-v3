<script setup lang="ts">
import { Icon, Tag } from "@/components/universal"
import { Flex } from "@/components/layout"
import { TagNodeElement } from "@/components-business/element"
import { SimpleTag, TagLink } from "@/functions/http-client/api/tag"
import { useDroppable } from "@/modules/drag"
import { useFetchHelper } from "@/functions/fetch"
import { useMessageBox } from "@/modules/message-box"

const props = defineProps<{
    value: TagLink[]
}>()

const emit = defineEmits<{
    (e: "update:value", value: TagLink[]): void
}>()

const message = useMessageBox()

const fetch = useFetchHelper({
    request: client => client.tag.get, 
    handleErrorInRequest(e) {
        if(e.code !== "NOT_FOUND") {
            return e
        }
    }
})

const add = async ({ id }: SimpleTag) => {
    const tag = await fetch(id)
    if(tag) {
        emit("update:value", [...props.value, {id: tag.id, color: tag.color, isSequenceGroup: tag.isSequenceGroup, isOverrideGroup: tag.isOverrideGroup, name: tag.name, type: tag.type}])
    }else{
        message.showOkMessage("error", "选择的作为链接的标签不存在。", `错误项: ${id}`)
    }
}

const remove = (idx: number) => {
    emit("update:value", [...props.value.slice(0, idx), ...props.value.slice(idx + 1)])
}

const { dragover: _, ...dropEvents } = useDroppable("tag", add)

</script>

<template>
    <Flex v-for="(item, idx) in value" class="mb-1">
        <Icon class="mr-1" icon="link"/>
        <TagNodeElement :node="item"/>
        <Icon class="mr-1" icon="close" @click="remove(idx)"/>
    </Flex>
    <Flex>
        <div v-bind="dropEvents">
            <Icon class="mr-1 has-text-success" icon="plus"/>
            <Tag color="success">拖曳标签到此处以添加链接</Tag>
        </div>
    </Flex>
</template>
