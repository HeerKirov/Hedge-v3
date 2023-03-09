<script setup lang="ts">
import { installSideLayoutState } from "@/components/layout"
import { installDialogService, GlobalDialog } from "@/components-module/dialog"
import { installCalloutService, GlobalCallout } from "@/components-module/callout"
import MainRootView from "./MainRootView.vue"

installDialogService()
installCalloutService()
installSideLayoutState()

</script>

<template>
    <MainRootView/>
    <GlobalDialog/>
    <GlobalCallout/>
    <!-- ViewStack -->
</template>
