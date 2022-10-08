<script setup lang="ts">
import { Button } from "@/components/universal"
import { CheckBox, Select, NumberInput } from "@/components/form"
import { Group } from "@/components/layout"
import { OrderTimeType } from "@/functions/http-client/api/setting-import"
import { useSettingImportData } from "@/services/setting"
import { usePropertySot } from "@/utils/forms"
import { computed } from "@vue/reactivity"
import DBImportSourceRule from "./DBImportSourceRule.vue"

const { data: settingImport } = useSettingImportData()

const [partitionTimeDelay, partitionTimeDelaySot, savePartitionTimeDelay] = usePropertySot(computed({
    get: () => settingImport.value ? (settingImport.value.setPartitionTimeDelay ?? 0) / (1000 * 60 * 60) : undefined,
    set: value => {
        if(settingImport.value && value) {
            settingImport.value.setPartitionTimeDelay = value * 1000 * 60 * 60
        }
    }
}))

const timeTypes: {value: OrderTimeType, label: string}[] = [
    {value: "IMPORT_TIME", label: "项目导入时间"},
    {value: "CREATE_TIME", label: "文件创建时间"},
    {value: "UPDATE_TIME", label: "文件修改时间"}
]
</script>

<template>
    <template v-if="!!settingImport">
        <div class="mt-2">
            <CheckBox v-model:value="settingImport.autoAnalyseSourceData">自动分析来源数据</CheckBox>
            <p class="secondary-text">导入文件时，自动分析导入项目的来源。</p>
        </div>
        <div class="mt-2">
            <CheckBox v-model:value="settingImport.setTagmeOfTag">自动设定Tagme:标签</CheckBox>
            <p class="secondary-text">导入文件时，自动将导入项目的Tagme标记为标签、主题和作者。</p>
        </div>
        <div class="mt-2">
            <CheckBox v-model:value="settingImport.setTagmeOfSource">自动设定Tagme:来源</CheckBox>
            <p class="secondary-text">导入文件时，自动将导入项目的Tagme标记为来源。不过，如果项目的来源可以被分析，则不会设定。</p>
        </div>
        <div class="mt-2">
            <label class="label">排序时间方案</label>
            <Select class="mt-1" :items="timeTypes" v-model:value="settingImport.setOrderTimeBy"/>
            <p class="secondary-text">使用选定的属性作为导入项目的排序时间。当选定的属性不存在时，自动选择其他属性。</p>
        </div>
        <div class="mt-2">
            <label class="label">分区判定时间段</label>
            <Group class="mt-1">
                <NumberInput :min="-23" :max="23" v-model:value="partitionTimeDelay"/>
                <span class="is-line-height-std">小时</span>
                <Button v-if="partitionTimeDelaySot" class="ml-2" mode="filled" type="primary" icon="save" square @click="savePartitionTimeDelay"/>
            </Group>
            <p class="secondary-text">从创建时间生成分区时间时，会将0点以后延迟一定时间内的时间点仍然视作前一天。</p>
        </div>
        <label class="label mt-2">来源数据解析规则</label>
        <DBImportSourceRule class="mt-1" v-model:rules="settingImport.sourceAnalyseRules"/>
    </template>
</template>
