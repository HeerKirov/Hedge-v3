<script setup lang="ts">
import { installSideLayoutState } from "@/components/layout"
import { installDialogService, GlobalDialog } from "@/components-module/dialog"
import MainRootView from "./MainRootView.vue"

installDialogService()
installSideLayoutState()

</script>

<template>
    <MainRootView/>
    <GlobalDialog/>
    <!-- ViewStack -->
    <!-- GlobalCallout -->
</template>
