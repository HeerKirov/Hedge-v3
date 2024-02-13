<script setup lang="ts">
import { QueryPlan } from "@/functions/http-client/api/util-query"
import QueryResultPlanSortList from "./QueryResultPlanSortList.vue"
import QueryResultPlanFilterItem from "./QueryResultPlanFilter.vue"
import QueryResultPlanElement from "./QueryResultPlanElement.vue"

defineProps<{
    plan: QueryPlan
}>()

</script>

<template>
    <div class="px-1 pb-1">
        <QueryResultPlanElement v-for="element in plan.elements" class="mt-1" :element-group="element"/>
        <QueryResultPlanFilterItem v-for="filterGroup in plan.filters" class="mt-1" :filter-group="filterGroup"/>
        <QueryResultPlanSortList v-if="plan.sorts.length > 0" class="mt-1" :sorts="plan.sorts"/>
    </div>
</template>
