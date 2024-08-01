<script setup lang="ts">
import { computed } from "vue"
import { Button, Separator } from "@/components/universal"
import { CheckBox, NumberInput } from "@/components/form"
import { useAppStorageStatus, useSettingAuth, useSettingStorage } from "@/services/setting"
import { usePropertySot } from "@/utils/forms"
import { toRefNullable } from "@/utils/reactivity"
import { numbers } from "@/utils/primitives"
import StorageBox from "./StorageBox.vue"

const { data: settingAuth } = useSettingAuth()

const { data: settingStorage } = useSettingStorage()

const { data: storageStatus, refresh: refreshStorageStatus } = useAppStorageStatus()

const [autoCleanTrashesIntervalDay, autoCleanTrashesIntervalDaySot, saveAutoCleanTrashesIntervalDay] = usePropertySot(toRefNullable(settingStorage, "autoCleanTrashesIntervalDay"))

const [autoCleanCachesIntervalDay, autoCleanCachesIntervalDaySot, saveAutoCleanCachesIntervalDay] = usePropertySot(toRefNullable(settingStorage, "autoCleanCachesIntervalDay"))

const [blockMaxSize, blockMaxSizeSot, saveBlockMaxSize] = usePropertySot(toRefNullable(settingStorage, "blockMaxSizeMB"))

const [blockMaxCount, blockMaxCountSot, saveBlockMaxCount] = usePropertySot(toRefNullable(settingStorage, "blockMaxCount"))

const cacheSize = computed(() => {
    if(storageStatus.value !== undefined) {
        const mib = storageStatus.value.cacheSize / (1024 * 1024)
        if(mib >= 1024) {
            return `${numbers.round2decimal(mib / 1024)}GiB`
        }else{
            return `${numbers.round2decimal(mib)}MiB`
        }
    }else{
        return ""
    }
})

</script>

<template>
    <template v-if="!!settingStorage">
        <StorageBox v-model:storage-path="settingStorage.storagePath" :connect-mode="settingAuth?.mode" :storage-status="storageStatus" @refresh:status="refreshStorageStatus"/>
        <label class="label mt-2">缓存位置</label>
        <p>当前缓存大小：{{ cacheSize }}</p>
        <p class="secondary-text">访问归档中的文件或在本地目录打开文件时，文件会被提取至缓存位置。</p>
        <CheckBox class="mt-3" v-model:value="settingStorage.autoCleanCaches">自动清理缓存</CheckBox>
        <p class="secondary-text">长时间未访问的缓存文件会被定期自动清理。</p>
        <div v-if="settingStorage.autoCleanCaches" class="mt-1 ml-2 is-line-height-small">
            自动清理期限天数：
            <NumberInput size="small" v-model:value="autoCleanCachesIntervalDay" :min="1" :max="90"/>天
            <Button v-if="autoCleanCachesIntervalDaySot" size="small" mode="filled" type="primary" icon="save" square @click="saveAutoCleanCachesIntervalDay"/>
        </div>
        <Separator direction="horizontal" :spacing="3"/>
        <label class="label">归档区块</label>
        <p class="secondary-text">归档中的文件按顺序打包存储。可以调整每个归档包的文件数量和容量上限。</p>
        <div class="mt-1 is-line-height-small">
            区块文件数量上限：
            <NumberInput size="small" width="half" v-model:value="blockMaxCount" :min="5" :max="5000"/>个
            <Button v-if="blockMaxCountSot" size="small" mode="filled" type="primary" icon="save" square @click="saveBlockMaxCount"/>
        </div>
        <div class="mt-1 is-line-height-small">
            区块文件容量上限：
            <NumberInput size="small" width="half" v-model:value="blockMaxSize" :min="10" :max="10000"/>MiB
            <Button v-if="blockMaxSizeSot" size="small" mode="filled" type="primary" icon="save" square @click="saveBlockMaxSize"/>
        </div>
    </template>
    <template v-if="!!settingStorage">
        <Separator direction="horizontal" :spacing="3"/>
        <label class="label mt-2">已删除</label>
        <CheckBox class="mt-2" v-model:value="settingStorage.autoCleanTrashes">自动清理「已删除」项</CheckBox>
        <p class="secondary-text">「已删除」超过一定时间的项会被定期自动清理。</p>
        <div v-if="settingStorage.autoCleanTrashes" class="mt-1 ml-2 is-line-height-small">
            自动清理期限天数：
            <NumberInput size="small" v-model:value="autoCleanTrashesIntervalDay" :min="1" :max="90"/>天
            <Button v-if="autoCleanTrashesIntervalDaySot" size="small" mode="filled" type="primary" icon="save" square @click="saveAutoCleanTrashesIntervalDay"/>
        </div>
    </template>
</template>