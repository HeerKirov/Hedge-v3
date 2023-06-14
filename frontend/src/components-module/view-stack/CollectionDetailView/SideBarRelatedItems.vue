<script setup lang="ts">
import { Icon, GridImages } from "@/components/universal"
import { useSideBarRelatedItems } from "@/services/view-stack/collection"

const { data, openAssociate, openAssociateInNewView } = useSideBarRelatedItems()

</script>

<template>
    <template v-if="data?.associates?.length">
        <b class="mb-1">关联组</b>
        <GridImages :images="data.associates.map(i => i.thumbnailFile)" :column-num="3" clickable @click="(_, i) => openAssociateInNewView(i)"/>
        <p class="float-right"><a @click="openAssociate">查看关联组的全部项目<Icon class="ml-1" icon="angle-double-right"/></a></p>
    </template>
    <div v-if="data && !data.associates.length" class="has-text-centered">
        <i class="has-text-secondary">没有相关的项目</i>
    </div>
</template>
