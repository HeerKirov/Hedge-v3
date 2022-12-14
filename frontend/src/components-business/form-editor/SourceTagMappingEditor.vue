<script setup lang="ts">
import { nextTick, ref, watch, watchEffect } from "vue"
import { Block, Button, Tag } from "@/components/universal"
import { Input } from "@/components/form"
import { Flex } from "@/components/layout"
import { SourceSiteSelectBox } from "@/components-business/form-editor"
import { MappingSourceTag } from "@/functions/http-client/api/source-tag-mapping"
import { useMessageBox } from "@/modules/message-box"
import { useSettingSite } from "@/services/setting"

const props = defineProps<{
    value: MappingSourceTag[]
    direction?: "horizontal" | "vertical"
}>()

const emit = defineEmits<{
    (e: "update:value", value: MappingSourceTag[]): void
}>()

useSettingSite()

const message = useMessageBox()

const selectedIndex = ref<number>()

const form = ref({
    site: <string | null>null,
    code: "",
    name: "",
    otherName: "",
    type: ""
})

const add = () => {
    const idx = props.value.length
    if(idx > 0) {
        const item = props.value[idx - 1]
        if(!item.site || !item.code || !item.name) {
            //如果最后一项是未完成编辑的项，则直接选定此项
            selectedIndex.value = idx - 1
            return
        }
    }
    emit("update:value", [...props.value, {site: form.value.site || "", code: "", name: "", otherName: null, type: null}])
    selectedIndex.value = idx
}

const remove = () => {
    if(selectedIndex.value !== undefined && selectedIndex.value >= 0 && selectedIndex.value < props.value.length) {
        const idx = selectedIndex.value
        selectedIndex.value = undefined
        emit("update:value", [...props.value.slice(0, idx), ...props.value.slice(idx + 1)])
    }
}

let formLockFlag = true

watchEffect(async () => {
    if(selectedIndex.value !== undefined && selectedIndex.value >= 0 && selectedIndex.value < props.value.length) {
        formLockFlag = false
        const item = props.value[selectedIndex.value]
        form.value = {
            site: item.site || null,
            code: item.code,
            name: item.name,
            otherName: item.otherName || "",
            type: item.type || ""
        }
        //tips: form的响应是异步触发的，因此需要使用nextTick将解锁操作推迟到vue的下次更新结束后，这才能保证watch被锁住从而跳过此次响应
        await nextTick()
        formLockFlag = true
    }
})

watch(form, form => {
    if(formLockFlag && selectedIndex.value !== undefined && selectedIndex.value >= 0 && selectedIndex.value < props.value.length) {
        const item = {
            site: form.site || "",
            code: form.code.trim(),
            name: form.name.trim(),
            otherName: form.otherName || null,
            type: form.type || null
        }
        emit("update:value", [...props.value.slice(0, selectedIndex.value), item, ...props.value.slice(selectedIndex.value + 1)])
    }
}, {deep: true})

</script>

<template>
    <div :class="[$style.root, direction === 'vertical' ? $style.vertical : $style.horizontal]">
        <div :class="$style.list">
            <component v-for="(item, idx) in value" :is="direction === 'vertical' ? 'p' : 'span'" :class="{'mb-1': true, 'mr-1': direction !== 'vertical'}">
                <b class="mr-1">·</b>
                <a @click="selectedIndex = idx">
                    <span class="has-text-secondary">[{{item.site}}]</span>
                    <Tag clickable>{{ item.name }}{{ item.otherName !== null ? `(${item.otherName})` : null }}</Tag>
                </a>
            </component>
            <component :is="direction === 'vertical' ? 'p' : 'span'" :class="{'mb-1': true, 'mr-1': direction !== 'vertical'}">
                <b v-if="direction === 'vertical'" class="mr-1">·</b>
                <Tag color="success" icon="plus" clickable @click="add">添加来源标签</Tag>
            </component>
        </div>
        <Block v-if="selectedIndex !== undefined" :class="$style.editor">
            <SourceSiteSelectBox class="mb-1" v-model:value="form.site"/>
            <Flex class="mb-1" :width="100" :spacing="1">
                <Input width="fullwidth" size="small" placeholder="编码" v-model:value="form.code"/>
                <Input width="fullwidth" size="small" placeholder="分类" v-model:value="form.type"/>
            </Flex>
            <Input class="mb-1" width="fullwidth" size="small" placeholder="名称" v-model:value="form.name"/>
            <Input class="mb-1" width="fullwidth" size="small" placeholder="别名" v-model:value="form.otherName"/>
            <div>
                <Button class="float-right" size="small" type="danger" icon="trash" @click="remove">删除</Button>
            </div>
        </Block>
    </div>
</template>

<style module lang="sass">
@import "../../styles/base/size"

.root.horizontal
    width: 100%
    min-height: 2rem
    max-height: 12rem
    display: flex
    flex-wrap: nowrap
    overflow-y: auto
    > .list
        width: 100%
    > .editor
        width: 250px
        flex-shrink: 0
.root.vertical
    width: 100%
    > .list
        max-height: 10rem
        overflow-y: auto
        display: flex
        flex-wrap: nowrap
        flex-direction: column

.editor
    padding: $spacing-2 $spacing-1
    margin-top: $spacing-1
</style>
