<script setup lang="ts">
import { Button, Icon } from "@/components/universal"
import { QueryRes } from "@/functions/http-client/api/util-query"

defineProps<{
    schema?: QueryRes | null
}>()

</script>

<template>
    <Button v-if="schema && (schema.warnings.length || schema.errors.length)" class="px-1">
        <Icon class="has-text-danger mr-1" icon="exclamation-triangle"/>
        <span class="mr-2">{{schema.errors.length ?? 0}}</span>
        <Icon class="has-text-warning mr-1" icon="exclamation-triangle"/>
        <span class="mr-1">{{schema.warnings.length ?? 0}}</span>
    </Button>
</template>
