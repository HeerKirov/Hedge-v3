<script setup lang="ts">
import { CheckBox } from "@/components/form"
import { useSettingFindSimilarData } from "@/services/setting"
import DBFindSimilarEditor from "./DBFindSimilarEditor.vue"

const { data: settingFindSimilar } = useSettingFindSimilarData()

</script>

<template>
    <template v-if="!!settingFindSimilar">
        <p class="mb-3">相似项查找默认选项</p>
        <DBFindSimilarEditor v-model:config="settingFindSimilar.defaultTaskConf"/>
        <CheckBox class="mt-4" v-model:value="settingFindSimilar.autoFindSimilar">自动执行相似项查找</CheckBox>
        <p class="secondary-text">导入项目时，自动对新导入的项目执行相似项查找。查找使用默认查找选项，或使用下面的自动查找选项覆盖。</p>
        <CheckBox 
            v-if="settingFindSimilar.autoFindSimilar" 
            class="mt-2"
            :value="settingFindSimilar.autoTaskConf !== null" 
            @update:value="settingFindSimilar!.autoTaskConf = $event ? {...settingFindSimilar!.defaultTaskConf} : null">
            使用单独的查找选项
        </CheckBox>
        <DBFindSimilarEditor v-if="settingFindSimilar.autoFindSimilar && settingFindSimilar.autoTaskConf" class="mt-3" v-model:config="settingFindSimilar.autoTaskConf"/>
    </template>
</template>
