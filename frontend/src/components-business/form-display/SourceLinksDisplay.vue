<script setup lang="ts">
import { Icon } from "@/components/universal"
import { openExternalLink } from "@/modules/others"

defineProps<{
    value?: string[]
}>()

</script>

<template>
    <div v-if="value?.length" class="mb-2 mt-3">
        <p v-for="link in value" class="mb-1 no-wrap overflow-hidden overflow-ellipsis selectable">
            <a @click="openExternalLink(link)"><Icon class="mr-1" icon="link"/>{{ link }}</a>
        </p>
    </div>
    <div v-else class="mb-2 mt-3">
        <i class="secondary-text">没有链接</i>
    </div>
</template>
