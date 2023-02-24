<script setup lang="ts">
import { LazyLoad } from "@/components/logical"
import { installAuthorContext } from "@/services/main/author"
import AuthorListPanel from "./AuthorListPanel.vue"
import AuthorCreatePanel from "./AuthorCreatePanel.vue"
import AuthorDetailPanel from "./AuthorDetailPanel.vue"

const { paneState } = installAuthorContext()

</script>

<template>
    <LazyLoad :visible="!paneState.opened.value" v-slot="{ visible }">
        <AuthorListPanel v-show="visible"/>
    </LazyLoad>
    <AuthorDetailPanel v-if="paneState.mode.value === 'detail'"/>
    <AuthorCreatePanel v-else-if="paneState.mode.value === 'create'"/>
</template>
