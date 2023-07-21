<script setup lang="ts">
import { Icon } from "@/components/universal"
import { SourceAdditionalInfo } from "@/functions/http-client/api/source-data"

defineProps<{
    value?: SourceAdditionalInfo[]
}>()

</script>

<template>
    <div v-if="value?.length" class="my-2">
        <p v-for="info in value" class="mb-1">
            <Icon class="mr-1" icon="diamond"/>
            <b class="mr-2">{{ info.label }}</b>
            <span class="no-wrap overflow-hidden overflow-ellipsis selectable">{{ info.value }}</span>
        </p>
    </div>
    <div v-else class="my-2">
        <i class="secondary-text">没有链接</i>
    </div>
</template>
