<script setup lang="ts">
import { LazyLoad } from "@/components/logical"
import { installPartitionContext } from "@/services/main/partition"
import PartitionView from "./PartitionView.vue"
import PartitionIllustList from "./PartitionIllustList.vue"

const { path } = installPartitionContext()

</script>

<template>
    <LazyLoad :visible="path === null" v-slot="{ visible }">
        <PartitionView v-show="visible"/>
    </LazyLoad>
    <PartitionIllustList v-if="path !== null"/>
</template>
