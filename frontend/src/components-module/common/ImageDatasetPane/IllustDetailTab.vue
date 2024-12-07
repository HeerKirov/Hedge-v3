<script setup lang="ts">
import { IllustType } from "@/functions/http-client/api/illust"
import { useSessionStorage } from "@/functions/app"
import { useInterceptedKey } from "@/modules/keyboard"
import { toRef } from "@/utils/reactivity"
import IllustTabDetailInfo from "./IllustTabDetailInfo.vue"
import IllustTabRelatedItems from "./IllustTabRelatedItems.vue"
import IllustTabSourceData from "./IllustTabSourceData.vue"

const { detailId, type } = defineProps<{
    detailId: number
    type: IllustType
    scene?: "CollectionDetail"
}>()

const storage = useSessionStorage<{tabType: "info" | "source" | "related"}>("illust/detail-tab", () => ({tabType: "info"}), true)

const tabType = toRef(storage, "tabType")

useInterceptedKey(["Meta+Digit1", "Meta+Digit2", "Meta+Digit3"], e => {
    if(e.key === "Digit1") tabType.value = "info"
    else if(e.key === "Digit2") tabType.value = "related"
    else if(e.key === "Digit3" && type === "IMAGE") tabType.value = "source"
})

</script>

<template>
    <KeepAlive>
        <IllustTabDetailInfo v-if="tabType === 'info'" :detailId :scene @set-tab="tabType = $event"/>
        <IllustTabRelatedItems v-else-if="tabType === 'related'" :detailId :type @back-tab="tabType = 'info'"/>
        <IllustTabSourceData v-else-if="tabType === 'source'" :detailId :type @back-tab="tabType = 'info'"/>
    </KeepAlive>
</template>
