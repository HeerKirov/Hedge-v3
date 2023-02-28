<script setup lang="ts">
import { toRef } from "vue"
import { MetaUtilIdentity } from "@/functions/http-client/api/util-meta"
import { MetaTagSummaryEditor } from "@/components-business/form-editor"
import { useIdentityModeData } from "./context"

const props = defineProps<{
    identity: MetaUtilIdentity
}>()

const emit = defineEmits<{
    (e: "updated"): void
}>()

const { data, setValue } = useIdentityModeData(toRef(props, "identity"), () => emit("updated"))

</script>

<template>
    <MetaTagSummaryEditor :identity="identity" :topics="data?.topics ?? []" :tags="data?.tags ?? []" :authors="data?.authors ?? []" :tagme="data?.tagme" :set-value="setValue" allow-tagme/>
</template>
