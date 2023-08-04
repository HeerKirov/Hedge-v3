<script setup lang="ts">
import { CheckBox } from "@/components/form"
import { ThemeSelector } from "@/components-business/form-editor"
import { useAppearance, useAppEnv } from "@/functions/app"
import { useSettingAuth, useSettingStorage } from "@/services/setting"
import AppGeneralPasswordBox from "./AppGeneralPasswordBox.vue"

const { platform } = useAppEnv()

const appearance = useAppearance()

const { data: auth } = useSettingAuth()

</script>

<template>
    <template v-if="!!appearance">
        <label class="label">主题</label>
        <ThemeSelector class="mt-1" v-model:theme="appearance.theme"/>
    </template>
    <template v-if="!!auth">
        <label class="label mt-6">安全选项</label>
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
</template>
