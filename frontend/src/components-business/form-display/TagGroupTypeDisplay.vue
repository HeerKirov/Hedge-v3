<script setup lang="ts">
import { Icon } from "@/components/universal"
import { TagGroupType } from "@/functions/http-client/api/tag"

defineProps<{
    value: TagGroupType
    member?: boolean
    memberIndex?: number
}>()

</script>

<template>
    <p>
        <template v-if="value === 'NO'">
            <Icon class="mr-1 has-text-secondary" icon="object-group"/><span class="secondary-text">非组</span>
        </template>
        <template v-else>
            <Icon class="mr-1" icon="object-group"/>组
            <template v-if="value  === 'SEQUENCE' || value === 'FORCE_AND_SEQUENCE'"><Icon class="mx-1" icon="sort-alpha-down"/>排序组</template>
            <template v-if="value  === 'FORCE' || value === 'FORCE_AND_SEQUENCE'"><b class="mx-1">!</b>强制唯一组</template>
        </template>
        <template v-if="member"><Icon class="ml-3 mr-1" icon="object-ungroup"/>组成员</template>
        <template v-if="memberIndex"><Icon class="mx-1" icon="sort-alpha-down"/>成员顺序<code>{{memberIndex}}</code></template>
    </p>
</template>
