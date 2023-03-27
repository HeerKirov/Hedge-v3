<script setup lang="ts">
import { LazyLoad } from "@/components/logical"
import { installFolderContext } from "@/services/main/folder"
import FolderListPanel from "./FolderListPanel.vue"
import FolderIllustList from "./FolderIllustList.vue"

const { viewState } = installFolderContext()

</script>

<template>
    <LazyLoad :visible="!viewState.opened.value" v-slot="{ visible }">
        <FolderListPanel v-show="visible"/>
    </LazyLoad>
    <FolderIllustList v-if="viewState.mode.value === 'detail'"/>
</template>
