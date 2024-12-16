<script setup lang="ts">
import { watch } from "vue"
import { IllustType } from "@/functions/http-client/api/illust"
import { useRouteStorage, useSessionStorage } from "@/functions/app"
import { useInterceptedKey } from "@/modules/keyboard"
import IllustTabDetailInfo from "./IllustTabDetailInfo.vue"
import IllustTabRelatedItems from "./IllustTabRelatedItems.vue"
import IllustTabSourceData from "./IllustTabSourceData.vue"

const { detailId, type, tabScope } = defineProps<{
    /**
     * target illust id。
     */
    detailId: number
    /**
     * target illust type。
     */
    type: IllustType
    /**
     * 场景：表明该组件所处的位置，以便根据位置对某些表单组件进行特化处理。
     */
    scene?: "CollectionDetail" | "CollectionPane"
    /**
     * 启用选项卡状态共享。使用相同的scopeName的详情侧边栏会共享。此状态共享不会持久化，仅存活到窗口结束。
     */
    tabScope?: string
}>()

const tabType = tabScope
    ? useSessionStorage<"info" | "source" | "related">(`illust/detail/tab-type/${tabScope}`, "info")
    : useRouteStorage<"info" | "source" | "related">(`illust/detail/tab-type/${tabScope}`, "info")

useInterceptedKey(["Meta+Digit1", "Meta+Digit2", "Meta+Digit3"], e => {
    if(e.key === "Digit1") tabType.value = "info"
    else if(e.key === "Digit2") tabType.value = "related"
    else if(e.key === "Digit3" && type === "IMAGE") tabType.value = "source"
})

watch(() => type, type => {
    if(type === "COLLECTION" && tabType.value === "source") {
        tabType.value = "info"
    }
})

</script>

<template>
    <KeepAlive>
        <IllustTabDetailInfo v-if="tabType === 'info'" :detailId :scene @set-tab="tabType = $event"/>
        <IllustTabRelatedItems v-else-if="tabType === 'related'" :detailId :scene :type @back-tab="tabType = 'info'"/>
        <IllustTabSourceData v-else-if="tabType === 'source'" :detailId :type @back-tab="tabType = 'info'"/>
    </KeepAlive>
</template>
