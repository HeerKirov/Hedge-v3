<script setup lang="ts">
import { SourceTag } from "@/functions/http-client/api/source-data"
import { SourceTagElement } from "@/components-business/element"

defineProps<{
    value?: SourceTag[]
}>()

</script>

<template>
    <div v-if="value?.length" class="my-2">
        <p v-for="tag in value" class="mb-1">
            <SourceTagElement :value="tag"/>
        </p>
    </div>
    <div v-else class="my-2">
        <i class="secondary-text">没有标签</i>
    </div>
</template>
