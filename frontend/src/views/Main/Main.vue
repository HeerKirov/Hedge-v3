<script setup lang="ts">
import { installSideLayoutState } from "@/components/layout"
import { installDialogService, GlobalDialog } from "@/components-module/dialog"
import { installCalloutService, GlobalCallout } from "@/components-module/callout"
import { installPreviewService, GlobalPreview } from "@/components-module/preview"
import { installViewStack, ViewStack } from "@/components-module/view-stack"
import MainRootView from "./MainRootView.vue"

installDialogService()
installCalloutService()
installPreviewService()
installSideLayoutState()
installViewStack()

</script>

<template>
    <MainRootView/>
    <ViewStack/>
    <GlobalDialog/>
    <GlobalCallout/>
    <GlobalPreview/>
</template>
