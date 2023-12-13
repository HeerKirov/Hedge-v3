<script setup lang="ts">
import { AddIllustProps } from "./context"
import AddIllustCollection from "./AddIllustCollection.vue"
import AddIllustBookFolder from "./AddIllustBookFolder.vue"

defineProps<{
    p: AddIllustProps
}>()

defineEmits<{
    (e: "close"): void
}>()

</script>

<template>
    <AddIllustCollection v-if="p.type === 'collection'" :p="p" @close="$emit('close')"/>
    <AddIllustBookFolder v-else :p="p" @close="$emit('close')"/>
</template>
