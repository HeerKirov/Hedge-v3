<script setup lang="ts">
import { computed } from "vue"
import { Button } from "@/components/universal"
import { BottomLayout } from "@/components/layout"
import { SourceInfo } from "@/components-business/form-display"
import { SourceDataSummaryEditor } from "@/components-business/form-editor"
import { useEditorData } from "./context"

const props = defineProps<{
    sourceSite: string
    sourceId: string
}>()

const emit = defineEmits<{
    (e: "completed"): void
}>()

const identify = computed(() => ({sourceSite: props.sourceSite, sourceId: props.sourceId}))

const { form, save } = useEditorData(identify, () => emit("completed"))

</script>

<template>
    <BottomLayout>
        <SourceInfo class="is-font-size-large mb-2" :source="{sourceSite, sourceId, sourcePart: null, sourcePartName: null}"/>
        <SourceDataSummaryEditor v-if="form !== null" v-model:data="form" :site="sourceSite"/>

        <template #bottom>
            <Button class="float-right mt-1" mode="filled" type="primary" :disabled="false" icon="check" @click="save">保存</Button>
        </template>
    </BottomLayout>
</template>
