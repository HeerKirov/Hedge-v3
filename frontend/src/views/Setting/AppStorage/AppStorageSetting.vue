<script setup lang="ts">
import { Button, Separator } from "@/components/universal"
import { CheckBox, NumberInput } from "@/components/form"
import { useSettingStorage } from "@/services/setting"
import { usePropertySot } from "@/utils/forms"
import { toRefNullable } from "@/utils/reactivity"
import StorageBox from "./StorageBox.vue"
import CacheBox from "./CacheBox.vue"

const { data: settingStorage } = useSettingStorage()

const [autoCleanTrashesIntervalDay, autoCleanTrashesIntervalDaySot, saveAutoCleanTrashesIntervalDay] = usePropertySot(toRefNullable(settingStorage, "autoCleanTrashesIntervalDay"))

const [blockMaxSize, blockMaxSizeSot, saveBlockMaxSize] = usePropertySot(toRefNullable(settingStorage, "blockMaxSizeMB"))

const [blockMaxCount, blockMaxCountSot, saveBlockMaxCount] = usePropertySot(toRefNullable(settingStorage, "blockMaxCount"))

</script>

<template>
    <template v-if="!!settingStorage">
        <StorageBox v-model:storage-path="settingStorage.storagePath"/>
    </template>
    <CacheBox/>
    <template v-if="!!settingStorage">
        <Separator direction="horizontal" :spacing="3"/>
        <label class="label">归档区块</label>
        <p class="secondary-text">归档中的文件按顺序打包存储。可以调整新生成的归档包的文件数量和容量上限。</p>
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
        <Separator direction="horizontal" :spacing="3"/>
        <label class="label mt-2">已删除</label>
        <CheckBox class="mt-2" v-model:value="settingStorage.autoCleanTrashes">自动清理「已删除」项</CheckBox>
        <p class="secondary-text">「已删除」超过一定时间的项会被定期自动清理。</p>
        <div v-if="settingStorage.autoCleanTrashes" class="mt-1 ml-2 is-line-height-small">
            自动清理期限：
            <NumberInput size="small" v-model:value="autoCleanTrashesIntervalDay" :min="1" :max="90"/>天
            <Button v-if="autoCleanTrashesIntervalDaySot" size="small" mode="filled" type="primary" icon="save" square @click="saveAutoCleanTrashesIntervalDay"/>
        </div>
    </template>
</template>