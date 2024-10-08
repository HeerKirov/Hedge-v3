<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { Group, Flex, FlexItem } from "@/components/layout"
import { Button, Tag, Block } from "@/components/universal"
import { Input } from "@/components/form"
import { SourceTagElement } from "@/components-business/element"
import { SourceTag } from "@/functions/http-client/api/source-data"
import { useMessageBox } from "@/modules/message-box"
import { useSettingSite } from "@/services/setting"
import { SourceTagTypeSelectBox } from "."

const props = defineProps<{
    site: string | null
    value: SourceTag[]
}>()

const emit = defineEmits<{
    (e: "update:value", value: SourceTag[]): void
}>()

const message = useMessageBox()

const { data: sites } = useSettingSite()

const selected = ref<{mode: "create"} | {mode: "edit", index: number} | {mode: "close"}>({mode: "close"})

const form = ref<SourceTag | null>(null)

const groupedTags = computed(() => {
    if(props.value?.length) {
        const site = sites.value?.find(s => s.name === props.site)
        const values = props.value.map((tag, idx) => ({tag, idx}))
        if(site?.tagTypes?.length) {
            return site.tagTypes.map(type => ({type, tags: values.filter(st => st.tag.type === type)})).filter(({ tags }) => tags.length > 0)
        }else{
            return [{type: "", tags: values}]
        }
    }else{
        return []
    }
})

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

const updateCreateItem = (item: SourceTag) => {
    if(selected.value.mode === "create") {
        emit("update:value", [...props.value, item])
    }
}

const updateEditItem = (item: SourceTag) => {
    if(selected.value.mode === "edit") {
        emit("update:value", [...props.value.slice(0, selected.value.index), item, ...props.value.slice(selected.value.index + 1)])
    }
}

const setCode = (newCode: string) => {
    const code = newCode.trim()
    if(selected.value.mode === "create") {
        if(code && form.value?.type) {
            //tag editor的创建逻辑是隐性实现的。
            //当在新建模式填充了code后，一旦失去焦点(触发setCode)，就会立刻将当前create表单创建为一个新的项并存储。
            //code为空时，则暂时搁置创建。
            if(props.value.find(t => t.code === code && t.type === form.value!.type)) {
                message.showOkMessage("prompt", "该标签已存在。", "在同一列表中创建了重名的标签。")
                return
            }
            form.value!.code = code
            updateCreateItem(form.value!)
            selected.value = {mode: "edit", index: props.value.length}
        }else{
            form.value!.code = code
        }
    }else if(selected.value.mode === "edit") {
        const index = selected.value.index
        if(props.value.find((t, i) => t.code === code && t.type === form.value!.type && index !== i)) {
            message.showOkMessage("prompt", "该标签已存在。", "在同一列表中创建了重名的标签。")
            return
        }
        updateEditItem({...form.value!, code})
    }
}

const setType = (type: string) => {
    if(selected.value.mode === "create") {
        form.value!.type = type
    }else if(selected.value.mode === "edit") {
        const index = selected.value.index
        if(props.value.find((t, i) => t.code === form.value!.code && t.type === type && index !== i)) {
            message.showOkMessage("prompt", "该标签已存在。", "在同一列表中创建了重名的标签。")
            return
        }
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
    <Flex :class="$style.root" align="top">
        <FlexItem :width="70">
            <table class="table no-border baseline">
                <tbody>
                    <tr v-for="{ type, tags } in groupedTags" :key="type">
                        <td><b>{{ type }}</b></td>
                        <td class="w-100"><Group><SourceTagElement v-for="{tag, idx} in tags" :key="tag.code" :value="tag" clickable @click="edit(idx)"/></Group></td>
                    </tr>
                </tbody>
                <tfoot>
                    <Tag color="success" icon="plus" clickable @click="create">新标签</Tag>
                </tfoot>
            </table>
        </FlexItem>
        <FlexItem v-if="form !== null" :width="30">
            <Block class="p-2">
                <Flex class="mb-1" :spacing="1">
                    <FlexItem :width="100">
                        <SourceTagTypeSelectBox size="small" :site="site" :value="form.type" @update:value="setType"/>
                    </FlexItem>
                    <FlexItem v-if="selected.mode === 'edit'" :shrink="0">
                        <Button size="small" square mode="light" type="danger" icon="trash" @click="deleteItem"/>
                    </FlexItem>
                </Flex>
                <Input class="mb-1" width="fullwidth" size="small" placeholder="标识编码" :value="form.code" @update:value="setCode" auto-focus/>
                <Flex class="mb-1" :spacing="1">
                    <Input size="small" width="fullwidth" placeholder="显示名称" :value="form.name" @update:value="setName"/>
                    <Input size="small" width="fullwidth" placeholder="别名" :value="form.otherName" @update:value="setOtherName"/>
                </Flex>
            </Block>
        </FlexItem>
    </Flex>
</template>

<style module lang="sass">
.root
    min-height: 2rem
</style>
