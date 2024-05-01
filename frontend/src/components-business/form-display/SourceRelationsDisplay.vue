<script setup lang="ts">
import { Icon } from "@/components/universal"

defineProps<{
    value?: string[]
}>()

</script>

<template>
    <div v-if="value?.length" class="my-2">
        <p v-for="r in value">
            <Icon icon="images" class="mr-2"/>
            关联项
            <b class="ml-1 selectable">{{r}}</b>
        </p>
    </div>
    <div v-else class="my-2">
        <i class="secondary-text">没有关联项</i>
    </div>
</template>
