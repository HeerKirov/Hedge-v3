<script setup lang="ts">
import { Button } from "@/components/universal"
import { CheckBox, NumberInput } from "@/components/form"
import { useSettingFileData } from "@/services/setting"
import { usePropertySot } from "@/utils/forms"
import { toRefNullable } from "@/utils/reactivity"

const { data: settingFile } = useSettingFileData()

const [autoCleanTrashesIntervalDay, autoCleanTrashesIntervalDaySot, saveAutoCleanTrashesIntervalDay] = usePropertySot(toRefNullable(settingFile, "autoCleanTrashesIntervalDay"))

</script>

<template>
    <template v-if="!!settingFile">
        <label class="label mt-2">已删除</label>
        <CheckBox class="mt-2" v-model:value="settingFile.autoCleanTrashes">自动清理「已删除」项</CheckBox>
        <p class="secondary-text">「已删除」超过一定时间的项会被定期自动清理。</p>
        <div v-if="settingFile.autoCleanTrashes" class="mt-1 ml-2 is-line-height-std">
            自动清理期限天数:
            <NumberInput v-model:value="autoCleanTrashesIntervalDay" :min="1" :max="90"/>天
            <Button v-if="autoCleanTrashesIntervalDaySot" size="small" mode="filled" type="primary" icon="save" square @click="saveAutoCleanTrashesIntervalDay"/>
        </div>
    </template>
</template>