<script setup lang="ts">
import { installSideLayoutState } from "@/components/layout"
import { installDialogService, GlobalDialog } from "@/components-module/dialog"
import { installCalloutService, GlobalCallout } from "@/components-module/callout"
import { installPreviewService, GlobalPreview } from "@/components-module/preview"
import { installViewStack, ViewStack } from "@/components-module/view-stack"
import { usePreviewWindowRouteReceiver } from "@/modules/router"

installDialogService()
installCalloutService()
installPreviewService()
installSideLayoutState({defaultSwitch: false})
const viewStack = installViewStack()

const parameter = usePreviewWindowRouteReceiver()

if(parameter?.type === "image") {
    viewStack.openImageView(parameter.imageIds, undefined, true)
}else if(parameter?.type === "collection") {
    viewStack.openCollectionView(parameter.collectionId, true)
}else if(parameter?.type === "book") {
    viewStack.openBookView(parameter.bookId, true)
}

</script>

<template>
    <ViewStack/>
    <GlobalDialog/>
    <GlobalCallout/>
    <GlobalPreview/>
</template>
