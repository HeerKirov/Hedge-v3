<script setup lang="ts">
import { installAppService } from "@/functions/app"
import { installGlobalKey } from "@/services/module/keyboard"
import TestForForm from "@/views/Test/TestForForm.vue"
import TestForLayout from "@/views/Test/TestForLayout.vue"
import TestForElement from "@/views/Test/TestForElement.vue"

//
// installAppService({
//     handleError(title, message) {
//         console.error(`${title}: ${message}`)
//     }
// })

installGlobalKey()

</script>

<template>
    <TestForElement/>
</template>
