<script setup lang="ts">
import { Group } from "@/components/layout"
import { Button } from "@/components/universal"
import { CheckBox, NumberInput } from "@/components/form"
import { ThemeSelector } from "@/components-business/form-editor"
import { useAppearance, useAppEnv } from "@/functions/app"
import { useSettingAuth, useSettingServer } from "@/services/setting"
import { usePropertySot } from "@/utils/forms"
import { toRefNullable } from "@/utils/reactivity"
import AppGeneralPasswordBox from "./AppGeneralPasswordBox.vue"
import AppGeneralBrowserBox from "./AppGeneralBrowserBox.vue"

const { platform } = useAppEnv()

const appearance = useAppearance()

const { data: auth } = useSettingAuth()

const { data: server } = useSettingServer()

const [timeOffsetHour, timeOffsetHourSot, saveTimeOffsetHour] = usePropertySot(toRefNullable(server, "timeOffsetHour"))

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
        <p v-if="auth?.mode !== 'remote'" class="mt-2">
            <CheckBox v-if="!!auth.password" v-model:value="auth.fastboot">快速启动</CheckBox>
            <CheckBox v-else disabled>快速启动</CheckBox>
            <span class="ml-1 secondary-text">在登录通过之前就启动核心服务，以加快启动速度。</span>
        </p>
    </template>
    <template v-if="!!server">
        <label class="label mt-6">时间偏移</label>
        <Group class="mt-1">
            <NumberInput :min="-23" :max="23" v-model:value="timeOffsetHour"/>
            <span class="is-line-height-std">小时</span>
            <Button v-if="timeOffsetHourSot" class="ml-2" mode="filled" type="primary" icon="save" square @click="saveTimeOffsetHour"/>
        </Group>
        <p class="secondary-text">0点之后，延迟一定时间内的时间点仍然视作前一天。这个偏移作用于包括导入、时间分区、主页的方方面面。</p>
    </template>
    <label class="label mt-6">外部链接</label>
    <AppGeneralBrowserBox class="mt-1"/>
</template>
