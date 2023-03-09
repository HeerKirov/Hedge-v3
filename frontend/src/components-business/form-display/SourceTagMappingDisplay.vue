<script setup lang="ts">
import { SourceTagElement } from "@/components-business/element"
import { MappingSourceTag } from "@/functions/http-client/api/source-tag-mapping"

const props = defineProps<{
    value: MappingSourceTag[]
    direction?: "horizontal" | "vertical"
}>()

</script>

<template>
    <div v-if="value.length > 0">
        <component v-for="item in value" :is="direction === 'vertical' ? 'p' : 'span'" :class="{'mb-1': true, 'mr-1': direction !== 'vertical'}">
            <span class="has-text-secondary">[{{item.site}}]</span>
            <SourceTagElement :value="item"/>
        </component>
    </div>
    <div v-else class="has-text-secondary">
        <b class="mr-1">·</b><i>没有来源标签</i>
    </div>
</template>
