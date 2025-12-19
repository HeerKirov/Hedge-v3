<script setup lang="ts">
import { Icon } from "@/components/universal"
import { useLocalStorage } from "@/functions/app"

const props = defineProps<{
    id: number
    fileName: string
    lockIn?: "id" | "fileName"
}>()

const status = props.lockIn === undefined ? useLocalStorage<"id" | "fileName">("id-and-file-name-display/status", "id") : undefined

const toggleStatus = props.lockIn === undefined ? () => {
    status!.value = status!.value === "id" ? "fileName" : "id"
} : undefined

</script>

<template>
    <div v-if="lockIn === 'id' || (lockIn === undefined && status === 'id')">
        <Icon :class="{'is-cursor-alias': lockIn === undefined}" icon="id-card" @click="toggleStatus"/><b class="ml-1 selectable">{{ id }}</b>
    </div>
    <div v-else-if="lockIn === 'fileName' || (lockIn === undefined && status === 'fileName')" class="flex">
        <span><Icon :class="{'is-cursor-alias': lockIn === undefined}" icon="file" @click="toggleStatus"/></span><b class="ml-1 selectable word-wrap-anywhere">{{ fileName }}</b>
    </div>
</template>  