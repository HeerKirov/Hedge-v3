<script setup lang="ts">
import { installSideLayoutState } from "@/components/layout"
import { installDialogService, GlobalDialog } from "@/components-module/dialog"
import { installCalloutService, GlobalCallout } from "@/components-module/callout"
import { installPreviewService, GlobalPreview } from "@/components-module/preview"
import { installStackedView, StackedView } from "@/components-module/stackedview"
import { ServerStatScreen } from "@/components-module/common"
import { installBrowserView } from "@/modules/browser"
import { installHomepageState } from "@/services/main/homepage"
import MainRootView from "./MainRootView.vue"
import routes from "./routes"

installBrowserView({...routes})
installDialogService()
installCalloutService()
installPreviewService()
installSideLayoutState()
installStackedView()
installHomepageState()

</script>

<template>
    <MainRootView/>
    <StackedView/>
    <GlobalDialog/>
    <GlobalCallout/>
    <GlobalPreview/>
    <ServerStatScreen/>
</template>
