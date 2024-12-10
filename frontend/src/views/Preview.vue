<script setup lang="ts">
import { installDialogService, GlobalDialog } from "@/components-module/dialog"
import { installCalloutService, GlobalCallout } from "@/components-module/callout"
import { installPreviewService, GlobalPreview } from "@/components-module/preview"
import { installStackedView, StackedView } from "@/components-module/stackedview"

installDialogService()
installCalloutService()
installPreviewService()
installStackedView({isRootView: true})

</script>

<template>
    <StackedView/>
    <GlobalDialog/>
    <GlobalCallout/>
    <GlobalPreview/>
</template>
