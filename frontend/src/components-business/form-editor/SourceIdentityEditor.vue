<script setup lang="ts">
import { computed } from "vue"
import { Input } from "@/components/form"
import { SourceSiteSelectBox } from "@/components-business/form-editor"
import { SourceDataPath } from "@/functions/http-client/api/all"
import { useSettingSite } from "@/services/setting"
import { computedMutable } from "@/utils/reactivity"
import { Flex, FlexItem } from "@/components/layout"

const props = defineProps<{
    source: SourceDataPath | null
}>()

const emit = defineEmits<{
    (e: "update:source", source: SourceDataPath | null): void
    (e: "enter"): void
}>()

const { data: sites } = useSettingSite()

const site = computedMutable(() => props.source?.sourceSite ?? null)

const siteModel = computed(() => site.value !== null ? sites.value?.find(s => s.name === site.value) ?? null : null)

const hasPart = computed(() => siteModel.value != null && siteModel.value.partMode !== "NO")

const hasPartName = computed(() => siteModel.value != null && siteModel.value.partMode === "PAGE_WITH_NAME")

const updateSite = (v: string | null) => {
    if(props.source !== null) {
        emit("update:source", v !== null ? {...props.source, sourceSite: v} : null)
    }else{
        site.value = v
    }
}

const updateId = (v: string | undefined) => {
    const sourceId = v?.trim() || null
    if(sourceId) {
        if(props.source !== null) {
            emit("update:source", {...props.source, sourceId})
        }else if(site.value !== null) {
            emit("update:source", {sourceSite: site.value, sourceId, sourcePart: null, sourcePartName: null})
        }
    }
}

const updatePart = (v: string | undefined) => {
    const sourcePart = v && !isNaN(parseInt(v)) ? parseInt(v) : null
    if(props.source !== null) {
        emit("update:source", {...props.source, sourcePart})
    }
}

const updatePartName = (v: string | undefined) => {
    if(props.source !== null) {
        emit("update:source", {...props.source, sourcePartName: v?.trim() || null})
    }
}

</script>

<template>
    <div>
        <SourceSiteSelectBox size="small" :value="site" @update:value="updateSite"/>
        <Flex v-if="site !== null" class="mt-1 w-100" :width="100" :spacing="1">
            <FlexItem :width="45">
                <Input size="small" update-on-input auto-focus placeholder="来源ID" :value="source?.sourceId" @update:value="updateId" @enter="$emit('enter')"/>
            </FlexItem>
            <FlexItem v-if="hasPart" :width="20">
                <Input size="small" update-on-input placeholder="分页" :value="source?.sourcePart?.toString()" @update:value="updatePart" @enter="$emit('enter')"/>
            </FlexItem>
            <FlexItem v-if="hasPartName" :width="35">
                <Input size="small" update-on-input placeholder="页名(可选)" :value="source?.sourcePartName" @update:value="updatePartName" @enter="$emit('enter')"/>
            </FlexItem>
        </Flex>
    </div>
</template>
