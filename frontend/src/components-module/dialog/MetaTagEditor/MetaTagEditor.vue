<script setup lang="ts">
import { CommonData, MetaTagEditorProps } from "./context"
import IdentityMode from "./IdentityMode.vue"
import OnlyEditorMode from "./OnlyEditorMode.vue"

const props = defineProps<{
    p: MetaTagEditorProps
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const updated = () => {
    if(props.p.mode === "identity") {
        props.p.onUpdated?.()
        emit("close")
    }
}

const resolve = (data: CommonData | undefined) => {
    if(props.p.mode === "custom") {
        props.p.resolve(data)
        emit("close")
    }
}

</script>

<template>
    <IdentityMode v-if="p.mode === 'identity'" :class="$style.root" :identity="p.identity" @updated="updated"/>
    <OnlyEditorMode v-else :class="$style.root" :data="p.data" :allow-tagme="p.allowTagme" @resolve="resolve"/>
</template>

<style module lang="sass">
.root
    height: 75vh
</style>