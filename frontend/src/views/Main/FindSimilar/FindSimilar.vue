<script setup lang="ts">
import { LazyLoad } from "@/components/logical"
import { installFindSimilarContext } from "@/services/main/find-similar"
import FindSimilarListPanel from "./FindSimilarListPanel.vue"
import FindSimilarDetailPanel from "./DetailPanel/FindSimilarDetailPanel.vue"

const { paneState } = installFindSimilarContext()

</script>

<template>
    <LazyLoad :visible="!paneState.opened.value" v-slot="{ visible }">
        <FindSimilarListPanel v-show="visible"/>
    </LazyLoad>
    <FindSimilarDetailPanel v-if="paneState.mode.value === 'detail'"/>
</template>
