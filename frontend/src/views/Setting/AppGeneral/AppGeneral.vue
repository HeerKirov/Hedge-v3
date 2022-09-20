<script setup lang="ts">
import { CheckBox } from "@/components/form"
import { ThemeSelector } from "@/components/displays"
import { useAppearance, useAppEnv } from "@/functions/app"
import { useSettingAuthData, useSettingServiceData } from "@/services/api/setting"
import AppGeneralPasswordBox from "./AppGeneralPasswordBox.vue"
import AppGeneralStorageBox from "./AppGeneralStorageBox.vue"

const { platform } = useAppEnv()

const appearance = useAppearance()

const auth = useSettingAuthData()

const { data: setviceSetting } = useSettingServiceData()

</script>

<template>
    <template v-if="!!appearance">
        <label class="label">主题</label>
        <ThemeSelector class="mt-1" v-model:theme="appearance.theme"/>
    </template>
    <template v-if="!!auth">
        <label class="label mt-4">安全选项</label>
        <AppGeneralPasswordBox class="mt-1" v-model:password="auth.password"/>
        <p v-if="platform === 'darwin'" class="mt-2">
            <CheckBox v-model:value="auth.touchID">使用Touch ID进行登录认证</CheckBox>
        </p>
        <p class="mt-2">
            <CheckBox v-if="!!auth.password" v-model:value="auth.fastboot">快速启动</CheckBox>
            <CheckBox v-else disabled>快速启动</CheckBox>
            <span class="ml-1 secondary-text">在登录通过之前就启动核心服务，以加快启动速度。</span>
        </p>
    </template>
    <template v-if="!!setviceSetting">
        <label class="label mt-4">存储选项</label>
        <AppGeneralStorageBox class="mt-1" v-model:storage-path="setviceSetting.storagePath"/>
    </template>
</template>
