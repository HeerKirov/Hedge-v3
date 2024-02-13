<script setup lang="ts">
import { Flex } from "@/components/layout"
import { QUERY_FIELD_NAMES } from "@/constants/translate"

defineProps<{
    sorts: string[]
}>()

</script>

<template>
    <Flex>
        <div :class="$style.name"><b>排序</b></div>
        <div :class="$style.list">
            <span v-for="(o, idx) in sorts">
                <b v-if="idx > 0" class="ml-1 mr-2">,</b>
                <b>{{o.charAt(0) === '-' ? '-' : '+'}}</b>{{QUERY_FIELD_NAMES[o.substring(1)] ?? o.substring(1)}}
            </span>
        </div>
    </Flex>
</template>

<style module lang="sass">
.name
    flex-shrink: 0
    width: 4rem
    padding: 0 0.25rem
    text-align: right

.list
    align-self: center
</style>
