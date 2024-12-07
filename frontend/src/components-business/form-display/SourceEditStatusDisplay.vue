<script setup lang="ts">
import { Icon } from "@/components/universal"
import { SourceEditStatus } from "@/functions/http-client/api/source-data"

defineProps<{
    value?: SourceEditStatus
}>()

</script>

<template>
    <p v-if="value === 'NOT_EDITED'"><Icon icon="edit"/><span class="ml-2 has-text-success">未编写</span></p>
    <p v-else-if="value === 'EDITED'"><Icon icon="pen-nib"/><span class="ml-2">已编写</span></p>
    <p v-else-if="value === 'ERROR'"><Icon icon="exclamation-triangle"/><span class="ml-2 has-text-danger">标记为错误</span></p>
    <p v-else><Icon icon="comment-dots"/><span class="ml-2 has-text-secondary">标记为忽略</span></p>
</template>
