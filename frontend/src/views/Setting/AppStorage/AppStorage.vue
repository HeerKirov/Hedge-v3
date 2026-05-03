<script setup lang="ts">
import { ref, onMounted } from "vue"
import { Button } from "@/components/universal"
import AppStorageSetting from "./AppStorageSetting.vue"
import AppStorageBlockList from "./AppStorageBlockList.vue"
import AppStorageFileList from "./AppStorageFileList.vue"

const view = ref<"setting" | "block-list" | "block-detail">("setting")
const blockDetailName = ref<string | null>(null)

const mounted = ref(false)

onMounted(() => mounted.value = true)

const openBlockDetail = (block: string) => {
    view.value = "block-detail"
    blockDetailName.value = block
}

</script>

<template>
    <Teleport v-if="mounted" to="#top-bar">
        <Button icon="gear" :mode="view === 'setting' ? 'light' : undefined" :type="view === 'setting' ? 'primary' : undefined" @click="view = 'setting'">存储选项</Button>
        <Button class="ml-1" icon="archive" :mode="view === 'block-list' ? 'light' : undefined" :type="view === 'block-list' ? 'primary' : undefined" @click="view = 'block-list'">文件管理</Button>
        <Button v-if="blockDetailName !== null" class="ml-1" icon="folder" :mode="view === 'block-detail' ? 'light' : undefined" :type="view === 'block-detail' ? 'primary' : undefined" @click="view = 'block-detail'">区块 {{ blockDetailName }}</Button>
        <div v-if="view === 'block-detail'" id="app-storage-view-toolbar" :class="$style['view-toolbar-host']"/>
    </Teleport>
    <AppStorageSetting v-if="view === 'setting'"/>
    <AppStorageBlockList v-else-if="view === 'block-list'" @open-block="openBlockDetail"/>
    <AppStorageFileList v-else-if="view === 'block-detail' && blockDetailName !== null" :key="blockDetailName" :block="blockDetailName"/>
</template>

<style module lang="sass">
.view-toolbar-host
    display: inline-flex
    align-items: center
    justify-content: flex-end
    flex-wrap: wrap
    flex: 1 1 auto
    min-width: 0
    margin-left: 0.25rem
</style>