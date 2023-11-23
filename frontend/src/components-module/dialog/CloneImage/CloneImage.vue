<script setup lang="ts">
import { CheckBox } from "@/components/form"
import { Button } from "@/components/universal"
import { Flex, BottomLayout } from "@/components/layout"
import { ImageCompareTable } from "@/components-module/data"
import { CloneImageProps, useCloneImageContext, FORM_OPTIONS, FORM_PROPS, FORM_TITLE } from "./context"
import { ImagePropsCloneForm } from "@/functions/http-client/api/illust"

const props = defineProps<{
    p: CloneImageProps
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const succeed = props.p.onSucceed && function(from: number, to: number, fromDeleted: boolean) {
    props.p.onSucceed?.(from, to, fromDeleted)
    emit("close")
}

const onlyGetProps = props.p.onlyGetProps && function(form: ImagePropsCloneForm) {
    props.p.onlyGetProps?.(form)
    emit("close")
}

const { fromId, toId, ids, titles, droppable, exchange, updateId, options, execute } = useCloneImageContext(props.p.from, props.p.to, succeed, onlyGetProps)

</script>

<template>
    <Flex class="h-100" :spacing="2">
        <div :class="$style['info-content']">
            <p class="mt-2 pl-1 is-font-size-large">属性克隆</p>
            <p class="mb-2 pl-1">将源图像的属性、关联关系完整地(或有选择地)复制给目标图像。</p>
            <ImageCompareTable :column-num="2" :ids="ids" :titles="titles" @update:id="updateId" :droppable="droppable"/>
        </div>
        <BottomLayout :class="$style['action-content']">
            <Button class="w-100" icon="exchange-alt" :disabled="fromId === null && toId === null" @click="exchange">交换源与目标</Button>
            <label class="label mt-2">选择克隆属性/关系</label>
            <p v-for="key in FORM_PROPS" class="mt-1"><CheckBox v-model:value="options[key]">{{FORM_TITLE[key]}}</CheckBox></p>
            <label class="label mt-2">高级选项</label>
            <p v-for="key in FORM_OPTIONS" class="mt-1"><CheckBox v-model:value="options[key]">{{FORM_TITLE[key]}}</CheckBox></p>
            <template #bottom>
                <Button class="mt-2 w-100" mode="filled" :type="options.deleteFrom ? 'danger' : 'primary'" icon="check" :disabled="fromId === null || toId === null" @click="execute">{{options.deleteFrom ? "执行克隆并删除源图像" : "执行克隆"}}</Button>
            </template>
        </BottomLayout>
    </Flex>
</template>

<style module lang="sass">
.info-content
    width: 100%
    overflow-y: auto
    height: 100%

.action-content
    width: 12rem
    flex-shrink: 0
</style>
