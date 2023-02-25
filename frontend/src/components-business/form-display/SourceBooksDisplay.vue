<script setup lang="ts">
import { Icon } from "@/components/universal"
import { SourceBook } from "@/functions/http-client/api/source-data"

defineProps<{
    value?: SourceBook[]
}>()

</script>

<template>
    <div v-if="value?.length" class="my-2">
        <p v-for="b in value">
            <Icon icon="clone" class="mr-2"/>《<b class="selectable">{{b.title}}</b>》
        </p>
    </div>
    <div v-else class="my-2">
        <i class="secondary-text">没有集合</i>
    </div>
</template>
