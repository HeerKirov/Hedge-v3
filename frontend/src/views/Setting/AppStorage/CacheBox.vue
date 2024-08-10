<script setup lang="ts">
import { computed } from "vue"
import { Button } from "@/components/universal"
import { NumberInput } from "@/components/form"
import { useClientCacheStatus, useSettingClientStorage } from "@/services/setting"
import { numbers } from "@/utils/primitives"
import { usePropertySot } from "@/utils/forms"
import { toRefNullable } from "@/utils/reactivity"

const { data: clientStorage } = useSettingClientStorage()

const { cacheStatus, cleanCache } = useClientCacheStatus()

const [cacheCleanIntervalDay, cacheCleanIntervalDaySot, saveCacheCleanIntervalDay] = usePropertySot(toRefNullable(clientStorage, "cacheCleanIntervalDay"))

const cacheSize = computed(() => {
    if(cacheStatus.value !== null) {
        const mib = cacheStatus.value.cacheSize / (1024 * 1024)
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
    <label class="label mt-2">缓存位置</label>
    <p class="my-1">当前缓存大小：{{ cacheSize }}</p>
    <p class="secondary-text">访问归档中的文件或在本地目录打开文件时，文件会被提取至缓存位置。</p>
    <p class="secondary-text">长时间未访问的缓存文件会被定期自动清理。</p>
    <div class="mt-1 ml-2 is-line-height-small">
        自动清理期限：
        <NumberInput size="small" v-model:value="cacheCleanIntervalDay" :min="1" :max="90"/>天
        <Button v-if="cacheCleanIntervalDaySot" size="small" mode="filled" type="primary" icon="save" square @click="saveCacheCleanIntervalDay"/>
        <Button class="float-right" size="small" icon="trash" @click="cleanCache">清理全部缓存</Button>
    </div>
</template>
