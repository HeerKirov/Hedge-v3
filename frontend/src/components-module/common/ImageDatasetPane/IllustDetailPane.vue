<script setup lang="ts">
import { BasePane } from "@/components/layout"
import { ThumbnailImage } from "@/components/universal"
import { SelectedPaneState } from "@/services/base/selected-pane-state"
import IllustDetailPaneSingle from "./IllustDetailPaneSingle.vue"
import IllustDetailPaneMultiple from "./IllustDetailPaneMultiple.vue"

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
                <i v-if="state.type === 'multiple'">已选择{{state.values.length}}项</i>
                <i v-else-if="state.type === 'none'" class="has-text-secondary">未选择任何项</i>
            </p>
        </template>

        <IllustDetailPaneSingle v-if="state.type === 'single'" :detail-id="state.value"/>
        <IllustDetailPaneMultiple v-else-if="state.type === 'multiple'" :selected="state.values" :latest="state.latest"/>
        <ThumbnailImage v-else minHeight="12rem" maxHeight="40rem"/>
    </BasePane>
</template>