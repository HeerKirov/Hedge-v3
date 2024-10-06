<script setup lang="ts">
import { Icon } from "@/components/universal"
import { useFetchReactive } from "@/functions/fetch"
import { useMemoryStorage } from "@/functions/app"
import CreatorBuiltinMode from "./CreatorBuiltinMode.vue"
import CreatorCustomMode from "./CreatorCustomMode.vue"

const emit = defineEmits<{
    (e: "created", name: string): void
}>()

const { data: builtins } = useFetchReactive({get: client => client.setting.source.site.listBuiltins})

const mode = useMemoryStorage<"BUILTIN" | "CUSTOM">("setting/sites/creator/mode", "BUILTIN")

const toggle = () => mode.value = mode.value === "CUSTOM" ? "BUILTIN" : "CUSTOM"

</script>

<template>
    <div class="flex jc-between align-baseline">
        <label class="flex-item no-grow-shrink label mt-2 mb-1">{{ mode === "BUILTIN" ? "添加内置站点" : "添加自定义站点" }}</label>
        <div class="flex-item w-100"/>
        <a class="flex-item no-grow-shrink is-font-size-small has-text-info" @click="toggle"><Icon icon="shuffle"/>{{ mode === "CUSTOM" ? "添加内置站点" : "添加自定义站点" }}</a>
    </div>
    <CreatorBuiltinMode v-if="mode === 'BUILTIN'" :builtins="builtins" @created="$emit('created', $event)"/>
    <CreatorCustomMode v-else :builtins="builtins" @created="$emit('created', $event)"/>
</template>
