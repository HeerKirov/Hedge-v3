<script setup lang="ts">
import { LazyLoad } from "@/components/logical"
import { installAuthorContext } from "@/services/main/author"
import AuthorListPanel from "./AuthorListPanel.vue"
import AuthorCreatePanel from "./AuthorCreatePanel.vue"
import AuthorDetailPanel from "./AuthorDetailPanel.vue"

const { paneState } = installAuthorContext()

</script>

<template>
    <LazyLoad :visible="!paneState.isOpen()" v-slot="{ visible }">
        <AuthorListPanel v-show="visible"/>
    </LazyLoad>
    <AuthorDetailPanel v-if="paneState.isDetailView()"/>
    <AuthorCreatePanel v-else-if="paneState.isCreateView()"/>
</template>
