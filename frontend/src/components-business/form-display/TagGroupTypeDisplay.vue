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
    <p class="is-cursor-text">
        <template v-if="value === 'NO'">
            <Icon class="mr-1 has-text-secondary" icon="object-group"/><span class="secondary-text">非组</span>
        </template>
        <template v-else>
            <Icon class="mr-1" icon="object-group"/>组
            <template v-if="value  === 'SEQUENCE' || value === 'FORCE_AND_SEQUENCE'" class="ml-3"><Icon class="mr-1" icon="sort-alpha-down"/>排序组</template>
            <template v-if="value  === 'FORCE' || value === 'FORCE_AND_SEQUENCE'" class="ml-3"><b class="mr-1">!</b>强制唯一组</template>
        </template>
        <template v-if="member" class="ml-3"><Icon class="mr-1" icon="object-ungroup"/>组成员</template>
        <template v-if="memberIndex" class="ml-3"><Icon class="mr-1" icon="sort-alpha-down"/>排序顺位<b>{{memberIndex}}</b></template>
    </p>
</template>
