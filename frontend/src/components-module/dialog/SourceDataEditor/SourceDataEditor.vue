<script setup lang="ts">
import { SourceDataEditorProps } from "./context"
import EditMode from "./EditMode.vue"
import CreateMode from "./CreateMode.vue"

const props = defineProps<{
    p: SourceDataEditorProps
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const editCompleted = () => {
    if(props.p.mode === "edit") {
        props.p.onUpdated?.()
    }
    emit("close")
}

const createCompleted = () => {
    if(props.p.mode === "create") {
        props.p.onCreated?.()
    }
    emit("close")
}

</script>

<template>
    <EditMode v-if="p.mode === 'edit'" :source-id="p.sourceId" :source-site="p.sourceSite" @completed="editCompleted"/>
    <CreateMode v-else @completed="createCompleted"/>
</template>
