<script setup lang="ts">
import MainRootView from "./MainRootView.vue"
import { installSideLayoutState } from "@/components/layout"

installSideLayoutState()

</script>

<template>
    <MainRootView/>
</template>
