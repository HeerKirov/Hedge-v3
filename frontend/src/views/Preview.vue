<script setup lang="ts">
import { installSideLayoutState } from "@/components/layout"
import { installDialogService, GlobalDialog } from "@/components-module/dialog"
import { installCalloutService, GlobalCallout } from "@/components-module/callout"
import { installViewStack, ViewStack } from "@/components-module/view-stack"
import { useRouterParamEvent } from "@/modules/router"

installDialogService()
installCalloutService()
installSideLayoutState()
const viewStack = installViewStack()

useRouterParamEvent("Preview", params => {
    if(params.type === "image") {
        viewStack.openImageView(params.imageIds, undefined, true)
    }else if(params.type === "collection") {
        viewStack.openCollectionView(params.collectionId, true)
    }else if(params.type === "book") {
        viewStack.openBookView(params.bookId, true)
    }
})

</script>

<template>
    <ViewStack/>
    <GlobalDialog/>
    <GlobalCallout/>
</template>
