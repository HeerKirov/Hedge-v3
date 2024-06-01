<script setup lang="ts">
import { toRef } from "vue"
import { Button, Tag } from "@/components/universal"
import { BottomLayout } from "@/components/layout"
import { SimpleMetaTagElement } from "@/components-business/element"
import { useRemoveModeData } from "./context"

const props = defineProps<{
    illustIds: number[]
    save: (form: {tags?: number[], topics?: number[], authors?: number[]}) => Promise<boolean>
}>()

const emit = defineEmits<{

}>()

const { form, removeAt, save, saveLoading } = useRemoveModeData(toRef(props, "illustIds"), props.save)

</script>

<template>
    <BottomLayout :container-class="$style.container">
        <p class="mb-1 pl-1">选择将要移除的标签：</p>
        <SimpleMetaTagElement v-for="(item, idx) in form" :key="item.key" :class="{[$style['delete-line']]: item.removed, 'mb-1': true, 'ml-4': true}" :type="item.type" :value="item.value" :color="item.removed ? 'secondary' : undefined" wrapped-by-div>
            <template #behind>
                <Tag class="ml-half" line-style="none" :color="item.removed ? 'secondary' : item.value.color" icon="close" clickable @click="removeAt(idx)"/>
            </template>
        </SimpleMetaTagElement>

        <template #bottom>
            <Button class="float-right" mode="filled" type="primary" :disabled="saveLoading" :icon="saveLoading ? 'circle-notch' : 'save'" :icon-spin="saveLoading" @click="save">保存</Button>
        </template>
    </BottomLayout>
</template>

<style module lang="sass">
.delete-line
    text-decoration: line-through
</style>