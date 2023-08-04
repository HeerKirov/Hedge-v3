<script setup lang="ts">
import { CheckBox } from "@/components/form"
import { useSettingFindSimilar } from "@/services/setting"
import DBFindSimilarEditor from "./DBFindSimilarEditor.vue"

const { data: settingFindSimilar } = useSettingFindSimilar()

</script>

<template>
    <template v-if="!!settingFindSimilar">
        <label class="label mb-2">默认选项</label>
        <DBFindSimilarEditor v-model:config="settingFindSimilar.defaultTaskConf"/>
        <CheckBox class="mt-4" v-model:value="settingFindSimilar.autoFindSimilar">自动执行相似项查找</CheckBox>
        <p class="secondary-text">导入项目时，自动对新导入的项目执行相似项查找。查找使用默认查找选项，或使用下面的自动查找选项覆盖。</p>
        <div class="pl-4">
            <CheckBox 
                v-if="settingFindSimilar.autoFindSimilar" 
                class="mt-2"
                :value="settingFindSimilar.autoTaskConf !== null" 
                @update:value="settingFindSimilar!.autoTaskConf = $event ? {...settingFindSimilar!.defaultTaskConf} : null">
                使用单独的查找选项
            </CheckBox>
            <DBFindSimilarEditor v-if="settingFindSimilar.autoFindSimilar && settingFindSimilar.autoTaskConf" class="mt-3" v-model:config="settingFindSimilar.autoTaskConf"/>
        </div>
    </template>
</template>
