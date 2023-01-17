<script setup lang="ts">
import { BasePane } from "@/components/layout"
import { ThumbnailImage } from "@/components/universal"
import { SelectedPaneState } from "@/services/base/selected-pane-state"
import ImportDetailPaneSingle from "./ImportDetailPaneSingle.vue"
import ImportDetailPaneMultiple from "./ImportDetailPaneMultiple.vue"

const props = defineProps<{
    state: SelectedPaneState<number>
}>()

defineEmits<{
    (e: "close"): void
}>()

</script>

<template>
    <BasePane @close="$emit('close')">
        <template #title>
            <p class="mt-2 ml-2">
                <i v-if="state.value.type === 'multiple'">已选择{{state.value.values.length}}项</i>
                <i v-else-if="state.value.type === 'none'" class="has-text-secondary">未选择任何项</i>
            </p>
        </template>

        <ImportDetailPaneSingle v-if="state.value.type === 'single'" :detail-id="state.value.value"/>
        <ImportDetailPaneMultiple v-else-if="state.value.type === 'multiple'" :selected="state.value.values" :latest="state.value.latest"/>
        <ThumbnailImage v-else minHeight="12rem" maxHeight="40rem"/>
    </BasePane>
</template>
