<script setup lang="ts">
import { Icon } from "@/components/universal"
import { TagAddressType } from "@/functions/http-client/api/tag"

defineProps<{
    value: TagAddressType
}>()

</script>

<template>
    <p v-if="value === 'TAG'"><Icon class="mr-1" icon="tag"/>标签</p>
    <p v-else-if="value === 'ADDR'"><Icon class="mr-1" icon="building"/>地址段</p>
    <p v-else><Icon class="mr-1" icon="border-style"/>虚拟地址段</p>
</template>
