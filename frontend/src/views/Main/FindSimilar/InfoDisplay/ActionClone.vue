<script setup lang="ts">
import { Block, Button } from "@/components/universal"
import { CheckBox } from "@/components/form"
import { Flex, FlexItem } from "@/components/layout"
import { Form, FORM_OPTIONS, FORM_PROPS, FORM_TITLE } from "@/components-module/dialog/CloneImage/context"
import { ImagePropsCloneForm } from "@/functions/http-client/api/illust"
import { useLocalStorage } from "@/functions/app"

const emit = defineEmits<{
    (e: "submit", props: ImagePropsCloneForm["props"], merge: boolean, deleteFrom: boolean): void
}>()

const options = useLocalStorage<Form>("dialog/clone-image/options", () => ({
    score: true, favorite: true, description: true, tagme: true, metaTags: true, orderTime: true, collection: true, books: true, folders: true
}), true)

const submit = () => {
    const { merge, deleteFrom, ...props } = options.value
    emit("submit", props, merge ?? false, deleteFrom ?? false)
}

</script>

<template>
    <Block class="p-1">
        <p class="is-font-size-small">添加从A到B的属性克隆:</p>
        <label class="label mt-2">选择克隆属性/关系</label>
        <Flex :multiline="true">
            <FlexItem v-for="key in FORM_PROPS" :width="50">
                <div><CheckBox v-model:value="options[key]">{{FORM_TITLE[key]}}</CheckBox></div>
            </FlexItem>
        </Flex>
        <label class="label mt-2">高级选项</label>
        <p v-for="key in FORM_OPTIONS" class="mt-1"><CheckBox v-model:value="options[key]">{{FORM_TITLE[key]}}</CheckBox></p>
        <div class="mt-1 has-text-right">
            <Button size="small" mode="filled" type="primary" @click="submit">确认</Button>
        </div>
    </Block>
</template>