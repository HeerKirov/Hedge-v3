<script setup lang="ts">
import { Button } from "@/components/universal"
import { BottomLayout } from "@/components/layout"
import { SourceIdentityNoPartEditor, SourceDataSummaryEditor } from "@/components-business/form-editor"
import { useCreateData } from "./context"

const emit = defineEmits<{
    (e: "completed"): void
}>()

const { identity, data, submit } = useCreateData(() => emit("completed"))

</script>

<template>
    <BottomLayout>
        <label class="label">新建来源数据</label>
        <SourceIdentityNoPartEditor :source-id="identity.sourceId" :source-site="identity.sourceSite" @update="identity = $event"/>
        <SourceDataSummaryEditor v-model:data="data"/>

        <template #bottom>
            <Button class="float-right" mode="filled" type="primary" :disabled="false" icon="check" @click="submit">保存</Button>
        </template>
    </BottomLayout>
</template>

<style module lang="sass">

</style>
