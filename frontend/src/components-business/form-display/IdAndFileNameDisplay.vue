<script setup lang="ts">
import { Icon } from "@/components/universal"
import { useLocalStorage } from "@/functions/app"

defineProps<{
    id: number
    fileName: string
}>()

const status = useLocalStorage<"id" | "fileName">("id-and-file-name-display/status", "id")

const toggleStatus = () => {
    status.value = status.value === "id" ? "fileName" : "id"
}

</script>

<template>
    <div v-if="status === 'id'" >
        <Icon class="is-cursor-alias" icon="id-card" @click="toggleStatus"/><b class="ml-1 selectable">{{ id }}</b>
    </div>
    <div v-else-if="status === 'fileName'" class="flex">
        <span><Icon class="is-cursor-alias" icon="file" @click="toggleStatus"/></span><b class="ml-1 selectable word-wrap-anywhere">{{ fileName }}</b>
    </div>
</template>  