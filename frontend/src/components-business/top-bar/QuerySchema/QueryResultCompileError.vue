<script setup lang="ts">
import { Block } from "@/components/universal"
import { CompileError } from "@/functions/http-client/api/util-query"

defineProps<{
    e: CompileError
    type: "warning" | "danger"
}>()

</script>

<template>
    <Block class="p-1 mt-1 is-font-size-small" :color="type">
        [{{e.code}}]<b v-if="e.happenPosition">({{e.happenPosition.begin}}, {{e.happenPosition.end ?? e.happenPosition.begin}})</b>: {{e.message}}
    </Block>
</template>
