<script setup lang="ts">
import { toRef } from "vue"
import { MetaTagSummaryEditor } from "@/components-module/data"
import { MetaTagEditorProps, useMetaTagEditorData } from "./context"

const props = defineProps<{
    p: MetaTagEditorProps
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const updated = () => {
    props.p.onUpdated?.()
    emit("close")
}

const p = toRef(props, "p")

const { data, identity, setValue } = useMetaTagEditorData(p, updated)

</script>

<template>
    <MetaTagSummaryEditor :class="$style.root" :identity="identity" :topics="data?.topics ?? []" :tags="data?.tags ?? []" :authors="data?.authors ?? []" :tagme="data?.tagme" :set-value="setValue" :allow-tagme="identity.type === 'IMAGE'"/>
</template>

<style module lang="sass">
.root
    height: 75vh
</style>