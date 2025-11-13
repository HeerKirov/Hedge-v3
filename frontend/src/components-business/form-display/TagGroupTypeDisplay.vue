<script setup lang="ts">
import { Icon } from "@/components/universal"

defineProps<{
    isSequenceGroup: boolean
    isOverrideGroup: boolean
    member?: boolean
    memberIndex?: number
}>()

</script>

<template>
    <p>
        <template v-if="!isSequenceGroup && !isOverrideGroup">
            <Icon class="mr-1 has-text-secondary" icon="object-group"/><span class="secondary-text">非组</span>
        </template>
        <template v-else>
            <span v-if="isSequenceGroup" class="mr-1"><Icon class="mr-1" icon="sort-alpha-down"/>排序组</span>
            <span v-if="isOverrideGroup" class="mr-1"><Icon class="mr-1" icon="object-group"/>覆盖组</span>
        </template>
        <template v-if="member"><Icon class="ml-3 mr-1" icon="object-ungroup"/>组成员</template>
        <template v-if="memberIndex"><Icon class="mx-1" icon="sort-alpha-down"/>成员顺序<code>{{memberIndex}}</code></template>
    </p>
</template>
