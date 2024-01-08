<script setup lang="ts">
import { Input } from "@/components/form"
import { SourceSiteSelectBox } from "@/components-business/form-editor"

const props = defineProps<{
    sourceSite: string | null
    sourceId: number | null
}>()

const emit = defineEmits<{
    (e: "update", identity: {sourceSite: string | null, sourceId: number | null}): void
}>()

const updateSite = (v: string | null) => emit("update", {sourceSite: v, sourceId: props.sourceId})

const updateId = (v: string | undefined) => emit("update", {sourceSite: props.sourceSite, sourceId: v ? parseInt(v) : null})

</script>

<template>
    <div>
        <SourceSiteSelectBox size="small" :value="sourceSite" @update:value="updateSite"/>
        <Input v-if="sourceSite" class="ml-1" size="small" width="three-quarter" update-on-input placeholder="来源ID" :value="sourceId?.toString()" @update:value="updateId"/>
    </div>
</template>
