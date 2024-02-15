<script setup lang="ts">
import { useInterceptedKey } from "@/modules/keyboard"
import { useInternalService } from "./context"
import ImagePreview from "./ImagePreview/ImagePreview.vue"

const { context, close } = useInternalService()

useInterceptedKey("Escape", close)

</script>

<template>
    <ImagePreview v-if="context?.preview === 'image'" embed :context="context" @close="close"/>
</template>
