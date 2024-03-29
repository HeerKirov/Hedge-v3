<script setup lang="ts">
import { computed } from "vue"
import { Input } from "@/components/form"
import { BottomLayout } from "@/components/layout"
import { Button, GridImages, Starlight } from "@/components/universal"
import { CreatingBookProps, useCreatingBookContext } from "./context"
import { installKeyDeclaration } from "@/modules/keyboard"

const props = defineProps<{
    p: CreatingBookProps
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const images = computed(() => props.p.images)

const onCreated = (bookId: number) => {
    props.p.onCreated?.(bookId)
    emit("close")
}

const { form, submit, files } = useCreatingBookContext(images, onCreated)

const enterOnInput = () => {
    if(form.value.title) submit()
}

installKeyDeclaration(["Escape"], true)

</script>

<template>
    <BottomLayout>
        <p class="mt-2 pl-1 is-font-size-large">新建画集</p>
        <label class="label mt-2">标题</label>
        <Input width="fullwidth" v-model:value="form.title" auto-focus @enter="enterOnInput"/>
        <label class="label mt-2">描述</label>
        <Input width="fullwidth" type="textarea" v-model:value="form.description"/>
        <label class="label mt-2">评分</label>
        <div class="w-25"><Starlight editable :value="form.score ?? null" @update:value="form.score = $event"/></div>
        <div v-if="files.length > 0" class="mt-2">
            <label class="label">图像列表预览</label>
            <GridImages :images="files" :column-num="8"/>
        </div>
        <template #bottom>
            <div class="mt-2">
                <span class="ml-2 is-line-height-std">共{{files.length}}个图像</span>
                <Button class="float-right" mode="filled" type="primary" icon="save" @click="submit">保存</Button>
            </div>
        </template>
    </BottomLayout>
</template>
