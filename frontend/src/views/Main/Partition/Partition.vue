<script setup lang="ts">
import { installPartitionContext } from "@/services/main/partition"
import PartitionView from "./PartitionView.vue"
import PartitionIllustList from "./PartitionIllustList.vue"

const { path } = installPartitionContext()

</script>

<template>
    <PartitionView v-if="path === null"/>
    <PartitionIllustList v-else/>
</template>
