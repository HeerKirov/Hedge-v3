<script setup lang="ts">
import { BasePane } from "@/components/layout"
import { ThumbnailImage } from "@/components/universal"
import { SelectedPaneState } from "@/services/base/selected-pane-state"

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
                <span v-else-if="state.value.type === 'none'" class="has-text-secondary">未选择任何项</span>
            </p>
        </template>

        <ThumbnailImage minHeight="12rem" maxHeight="40rem"/>
    </BasePane>
</template>

<style module lang="sass">

</style>
