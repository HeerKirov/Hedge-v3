<script setup lang="ts">
import { installSideLayoutState } from "@/components/layout"
import { installDialogService, GlobalDialog } from "@/components-module/dialog"
import { installCalloutService, GlobalCallout } from "@/components-module/callout"
import { installPreviewService, GlobalPreview } from "@/components-module/preview"
import { installViewStack, ViewStack } from "@/components-module/view-stack"
import { installBrowserView } from "@/modules/browser"
import { installHomepageState } from "@/services/main/homepage"
import MainRootView from "./NewMainRootView.vue"
import routes from "./routes"

installBrowserView({routes})
installDialogService()
installCalloutService()
installPreviewService()
installSideLayoutState()
installViewStack()
installHomepageState()

</script>

<template>
    <MainRootView/>
    <ViewStack/>
    <GlobalDialog/>
    <GlobalCallout/>
    <GlobalPreview/>
</template>
