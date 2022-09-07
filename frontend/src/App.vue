<script setup lang="ts">
import { installAppService } from "@/functions/app"
import { installFetchManager } from "@/functions/fetch"
import { installDocumentManager } from "@/services/module/document"
import { installGlobalKeyManager } from "@/services/module/keyboard"
import { installRouterParamManager } from "@/services/module/router"
import { installMessageBoxManager } from "@/services/module/message-box"
import { installToastManager } from "@/services/module/toast"
import { MessageBoxModule, ToastModule } from "@/layouts/module"

installDocumentManager()
installRouterParamManager()
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
