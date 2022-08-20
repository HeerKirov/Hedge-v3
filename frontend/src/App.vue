<script setup lang="ts">
import { installAppService } from "@/functions/app"

installAppService({
    handleError(title, message) {
        console.error(`${title}: ${message}`)
    }
})

</script>

<template lang="pug">
RouterView
</template>
