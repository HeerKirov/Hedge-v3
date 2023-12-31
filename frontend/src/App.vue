<script setup lang="ts">
import { installAppService } from "@/functions/app"
import { installFetchManager } from "@/functions/fetch"
import { installDocumentManager } from "@/modules/document"
import { installGlobalKeyManager } from "@/modules/keyboard"
import { installMessageBoxManager } from "@/modules/message-box"
import { installToastManager } from "@/modules/toast"
import { MessageBoxModule, ToastModule } from "@/components-module/module"

installDocumentManager()
installGlobalKeyManager()
installMessageBoxManager()
const { handleError, handleException } = installToastManager()
const { httpClient, wsClient } = installAppService({ handleError })
installFetchManager({ httpClient, wsClient, handleException })

</script>

<template>
    <RouterView/>
    <MessageBoxModule/>
    <ToastModule/>
</template>
