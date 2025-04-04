<script setup lang="ts">
import { Block, Separator } from "@/components/universal"
import { CheckBox, NumberInput, Select } from "@/components/form"
import { MetaType } from "@/functions/http-client/api/all"
import { OrderTimeType } from "@/functions/http-client/api/setting"
import { useSettingClientStorage, useSettingImport } from "@/services/setting"
import DBImportSourceRule from "./DBImportSourceRule.vue"
import DBImportDirectoriesEditor from "./DBImportDirectoriesEditor.vue"

const { data: settingImport } = useSettingImport()

const { data: clientStorage } = useSettingClientStorage()

const updateReflectMetaTagTypes = (metaType: MetaType, value: boolean) => {
    if(value && !settingImport.value!.reflectMetaTagType.includes(metaType)) settingImport.value!.reflectMetaTagType = [...settingImport.value!.reflectMetaTagType, metaType]
    else if(!value && settingImport.value!.reflectMetaTagType.includes(metaType)) settingImport.value!.reflectMetaTagType = settingImport.value!.reflectMetaTagType.filter(i => i !== metaType)
}

const timeTypes: {value: OrderTimeType, label: string}[] = [
    {value: "IMPORT_TIME", label: "项目导入时间"},
    {value: "CREATE_TIME", label: "文件创建时间"},
    {value: "UPDATE_TIME", label: "文件修改时间"}
]

</script>

<template>
    <template v-if="!!settingImport">
        <div class="mt-2">
            <CheckBox v-model:value="settingImport.autoAnalyseSourceData">分析来源数据</CheckBox>
            <p class="secondary-text">导入文件时，通过文件名分析导入项目的来源数据。</p>
        </div>
        <div class="mt-2">
            <CheckBox :disabled="!settingImport.autoAnalyseSourceData" v-model:value="settingImport.preventNoneSourceData">阻止无来源的导入</CheckBox>
            <p class="secondary-text">导入文件时，无法分析获得来源数据的项目将被阻止。</p>
        </div>
        <div class="mt-2">
            <CheckBox v-model:value="settingImport.setTagmeOfTag">设定Tagme</CheckBox>
            <p class="secondary-text">导入文件时，自动设置导入项目的Tagme。</p>
        </div>
        <div class="mt-2">
            <p class="mt-1 is-line-height-small">排序时间方案：<Select size="small" :items="timeTypes" v-model:value="settingImport.setOrderTimeBy"/></p>
            <p class="secondary-text">使用选定的属性作为导入项目的排序时间。当选定的属性不存在时，自动选择其他属性。</p>
        </div>
        <div class="mt-4">
            <label class="label">标签映射</label>
            <div class="mt-1">
                <CheckBox v-model:value="settingImport.autoReflectMetaTag">导入时标签映射</CheckBox>
                <p class="secondary-text">导入文件时，若来源数据已存在，则会利用现有的标签映射规则，自动为导入项目添加元数据标签。</p>
            </div>
            <div class="mt-2">
                <CheckBox class="mr-2" :disabled="!settingImport.autoReflectMetaTag" :value="settingImport.reflectMetaTagType.includes('TAG')" @update:value="updateReflectMetaTagTypes('TAG', $event)">标签</CheckBox>
                <CheckBox class="mr-2" :disabled="!settingImport.autoReflectMetaTag" :value="settingImport.reflectMetaTagType.includes('TOPIC')" @update:value="updateReflectMetaTagTypes('TOPIC', $event)">主题</CheckBox>
                <CheckBox :disabled="!settingImport.autoReflectMetaTag" :value="settingImport.reflectMetaTagType.includes('AUTHOR')" @update:value="updateReflectMetaTagTypes('AUTHOR', $event)">作者</CheckBox>
                <p class="secondary-text">启用哪些类型的元数据标签映射。</p>
            </div>
        </div>
        <div class="mt-4">
            <label class="label">文件处理</label>
            <div class="mt-1">
                <CheckBox v-model:value="settingImport.autoConvertFormat">自动将较大的无损文件转换至有损类型</CheckBox>
                <p class="secondary-text">导入文件时，对于容量较大的无损格式文件，自动将其转换为有损格式文件，以在几乎不影响质量的前提下减少容量。</p>
                <p class="mt-1 is-line-height-small">PNG格式转换阈值：<NumberInput size="small" width="half" :disabled="!settingImport.autoConvertFormat" v-model:value="settingImport.autoConvertPNGThresholdSizeMB" :min="0"/>MiB</p>
            </div>
        </div>
    </template>
    <template v-if="!!clientStorage">
        <Separator direction="horizontal" :spacing="2"/>
        <div>
            <label class="label">监听自动导入</label>
            <DBImportDirectoriesEditor v-model:value="clientStorage.fileWatchPaths"/>
            <p class="secondary-text">此功能可以监听数个本地目录，向这些目录写入文件时，自动导入这些文件。</p>
            <p class="mt-1"><CheckBox v-model:value="clientStorage.autoFileWatch">自动开启</CheckBox></p>
            <p class="secondary-text">程序启动时，自动将此功能设置为开启状态。</p>
            <p class="mt-1"><CheckBox v-model:value="clientStorage.fileWatchInitialize">首先扫描已存在文件</CheckBox></p>
            <p class="secondary-text">此功能开启时，将首先扫描目录中已存在的文件。</p>
            <p class="mt-1"><CheckBox v-model:value="clientStorage.fileWatchMoveMode">移除已被导入的文件</CheckBox></p>
            <p class="secondary-text">导入文件时，将文件从原位置移除。</p>
        </div>
    </template>
    <template v-if="!!settingImport">
        <Separator direction="horizontal" :spacing="2"/>
        <label class="label">来源解析规则</label>

        <p class="mt-1">对于<b>内置</b>来源站点，内置统一的来源解析规则:</p>
        <Block class="p-1">
            <code>{站点标识名称}_{ID}<span class="has-text-secondary">[</span>_{页码}<span class="has-text-secondary">[</span>_{页名}<span class="has-text-secondary">]]</span></code>
            <span class="secondary-text float-right is-line-height-tiny">页码、页名会根据站点的分页规则可选。</span>
        </Block>
        <p class="mt-1">除此之外，可以使用正则表达式为自定义站点添加解析规则，或为内置站点追加额外的规则。</p>
        <DBImportSourceRule class="mt-1" v-model:rules="settingImport.sourceAnalyseRules"/>
    </template>
</template>
