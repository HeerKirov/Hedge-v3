<script setup lang="ts">
import { computed, ref } from "vue"
import { Tag, Block, Button } from "@/components/universal"
import { Group, Flex } from "@/components/layout"
import { CheckBox } from "@/components/form"
import { SourceTagElement, SimpleMetaTagElement } from "@/components-business/element"
import { SourceMappingTargetDetail } from "@/functions/http-client/api/source-tag-mapping"
import { SourceTag } from "@/functions/http-client/api/source-data"
import { MetaTagTypes, MetaTagValues, MetaType } from "@/functions/http-client/api/all"
import { useCalloutService } from "@/components-module/callout"
import { useDroppable } from "@/modules/drag"
import { usePopupMenu } from "@/modules/popup-menu"
import { writeClipboard } from "@/modules/others"

const props = defineProps<{
    sourceTag: SourceTag
    mappings: SourceMappingTargetDetail[]
    selected: boolean
    tagFilter: boolean
    topicFilter: boolean
    authorFilter: boolean
}>()

const emit = defineEmits<{
    (e: "update:selected", v: boolean): void
    (e: "update:mappings", v: SourceMappingTargetDetail[]): void
    (e: "dblclick:one", type: MetaTagTypes, value: MetaTagValues): void
}>()

const callout = useCalloutService()

const items = computed(() => props.mappings.map(item => ({
    key: `${item.metaType}-${item.metaTag.id}`,
    type: item.metaType.toLowerCase() as MetaTagTypes,
    value: item.metaTag,
    enabled: item.metaType === "AUTHOR" ? props.authorFilter : item.metaType === "TOPIC" ? props.topicFilter : props.tagFilter
})))

const editMode = ref(false)

const changed = ref(false)

const editorForm = ref<{type: MetaTagTypes, value: MetaTagValues, key: string}[]>([])

const edit = () => {
    changed.value = false
    editorForm.value = props.mappings.map(item => ({
        key: `${item.metaType}-${item.metaTag.id}`,
        type: item.metaType.toLowerCase() as MetaTagTypes,
        value: item.metaTag
    }))
    editMode.value = true
}

const removeAt = (index: number) => {
    editorForm.value.splice(index, 1)
    changed.value = true
}

const save = () => {
    if(changed.value) {
        const value = editorForm.value.map(item => ({metaType: item.type.toUpperCase() as MetaType, metaTag: item.value} as SourceMappingTargetDetail))
        emit("update:mappings", value)
    }
    cancel()
}

const cancel = () => {
    editMode.value = false
    changed.value = false
    editorForm.value = []
}

const addOne = (type: MetaTagTypes, value: MetaTagValues, enabled: boolean) => {
    if(enabled) {
        emit("dblclick:one", type, value)
    }
}

const sourceTagMenu = usePopupMenu([
    {type: "normal", label: "复制此标签的标识编码", click() { writeClipboard(props.sourceTag.code) }}
])

const mappingMenu = usePopupMenu([
    {type: "normal", label: "编辑映射", click: edit}
])

const { dragover: _, ...dropEvents } = useDroppable(["author", "topic", "tag"], (metaTag, type) => {
    const added = {type: type, value: metaTag, key: `${type.toUpperCase()}-${metaTag.id}`}
    if(!editorForm.value.find(i => i.type === added.type && i.value.id === added.value.id)) {
        editorForm.value.push(added)
        changed.value = true
    }
})

const click = (e: MouseEvent, type: MetaTagTypes, value: MetaTagValues, enabled: boolean) => {
    if(enabled) {
        callout.show({base: (e.target as Element).getBoundingClientRect(), callout: "metaTag", metaType: type, metaId: value.id})
    }
}

</script>

<template>
    <tr>
        <td>
            <CheckBox :disabled="mappings.length <= 0" :value="selected" @update:value="$emit('update:selected', $event)"/>
        </td>
        <td @contextmenu="sourceTagMenu.popup()">
            <SourceTagElement :value="sourceTag"/>
        </td>
        <td>
            <Block v-if="editMode" v-bind="dropEvents" class="p-1">
                <Group class="mt-1">
                    <SimpleMetaTagElement v-for="item in editorForm" :key="item.key" :type="item.type" :value="item.value">
                        <template #behind>
                            <Tag class="ml-half" line-style="none" :color="item.value.color" icon="close" clickable @click="removeAt(idx)"/>
                        </template>
                    </SimpleMetaTagElement>
                </Group>
                <div class="secondary-text has-text-centered px-4 py-1">
                    拖动标签到此处以添加映射项
                </div>
                <Flex horizontal="right" :spacing="1">
                    <Button size="small" mode="light" type="primary" icon="save" :disabled="!changed" @click="save">保存</Button>
                    <Button size="small" mode="light" icon="times" @click="cancel">取消</Button>
                </Flex>
            </Block>
            <Group v-else-if="items.length > 0" class="mb-m1">
                <SimpleMetaTagElement v-for="item in items" :key="item.key"
                                      :type="item.type" :value="item.value"
                                      :draggable="item.enabled" :color="!item.enabled ? 'secondary' : undefined"
                                      @click="click($event, item.type, item.value, item.enabled)"
                                      @dblclick="addOne(item.type, item.value, item.enabled)"
                                      @contextmenu="mappingMenu.popup()"/>
            </Group>
            <Tag v-else icon="plus" @click="edit">编辑映射</Tag>
        </td>
    </tr>
</template>

<style module lang="sass">

</style>
