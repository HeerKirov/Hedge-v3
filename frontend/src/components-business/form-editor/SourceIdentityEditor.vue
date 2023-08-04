<script setup lang="ts">
import { computed } from "vue"
import { Input } from "@/components/form"
import { SourceSiteSelectBox } from "@/components-business/form-editor"
import { useSettingSite } from "@/services/setting"

const props = defineProps<{
    site: string | null
    sourceId: number | null
    sourcePart: number | null
}>()

const emit = defineEmits<{
    (e: "update", identity: {site: string | null, sourceId: number | null, sourcePart: number | null}): void
}>()

const { data: sites } = useSettingSite()

const siteModel = computed(() => props.site != null ? sites.value?.find(s => s.name === props.site) ?? null : null)

const updateSite = (v: string | null) => emit("update", {site: v, sourceId: props.sourceId, sourcePart: props.sourcePart})

const updateId = (v: string | undefined) => emit("update", {site: props.site, sourceId: v ? parseInt(v) : null, sourcePart: props.sourcePart})

const updatePart = (v: string | undefined) => emit("update", {site: props.site, sourceId: props.sourceId, sourcePart: v ? parseInt(v) : null})

</script>

<template>
    <div>
        <SourceSiteSelectBox :value="site" @update:value="updateSite"/>
        <p class="mt-1">
            <Input v-if="site" class="mr-1" size="small" width="three-quarter" update-on-input placeholder="来源ID" :value="sourceId?.toString()" @update:value="updateId"/>
            <Input v-if="siteModel?.hasSecondaryId" size="small" width="one-third" update-on-input placeholder="分P" :value="sourcePart?.toString()" @update:value="updatePart"/>
        </p>
    </div>
</template>
