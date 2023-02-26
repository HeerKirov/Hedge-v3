<script setup lang="ts">
import { QueryRes } from "@/functions/http-client/api/util-query"
import QueryResultPlan from "./QueryResultPlan.vue"
import QueryResultCompileError from "./QueryResultCompileError.vue"

defineProps<{
    schema: QueryRes | null
}>()

</script>

<template>
    <div v-if="schema" class="p-1">
        <QueryResultPlan v-if="schema.queryPlan !== null" :plan="schema.queryPlan"/>
        <QueryResultCompileError v-for="e in schema.errors" :e="e" type="danger"/>
        <QueryResultCompileError v-for="e in schema.warnings" :e="e" type="warning"/>
    </div>
</template>
