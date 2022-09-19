<script setup lang="ts">
import { useRouter } from "vue-router"
import { Button, Icon } from "@/components/universal"
import { BottomLayout } from "@/components/layout"
import { NativeTheme } from "@/functions/ipc-client"
import { useAppInitializer } from "@/functions/app"
import { NATIVE_THEME_NAMES } from "@/constants/ui"
import { strings } from "@/utils/primitives"

const props = defineProps<{
    password: {
        hasPassword: boolean
        password: string
    }
    database: {
        customLocation: boolean
        storagePath: string
    }
    theme: {
        theme: NativeTheme
    }
}>()

defineEmits<{
    (e: "prev"): void
}>()

const router = useRouter()

const { initialize, initializeState } = useAppInitializer()

const execute = () => {
    initialize({
        password: props.password.hasPassword ? props.password.password : null,
        storagePath: props.database.customLocation ? props.database.storagePath : null,
        theme: props.theme.theme
    })
}

const finish = () => router.push({name: "MainHome"})

const initializingMessage: Record<string, string> = {
    "INITIALIZING_APPDATA": "正在构建数据文档……",
    "INITIALIZING_RESOURCE": "正在部署资源……",
    "INITIALIZING_SERVER": "正在启动服务……",
    "INITIALIZING_SERVER_DATABASE": "正在构建数据库……"
}

</script>

<template>
    <BottomLayout v-if="initializeState === undefined">
        <h3 class="mb-4">已就绪</h3>
        <p>必要的配置已选择。</p>

        <div class="mt-2">
            <label class="label">口令</label>
            <p>{{password.hasPassword ? strings.repeat("*", password.password.length) : "未设置口令"}}</p>
        </div>
        <div class="mt-2">
            <label class="label">存储位置</label>
            <p>{{database.customLocation ? database.storagePath : "默认位置"}}</p>
        </div>
        <div class="mt-2">
            <label class="label">主题</label>
            <p>{{NATIVE_THEME_NAMES[theme.theme]}}</p>
        </div>
        <div class="mt-2">
            <p>接下来将:</p>
            <p>1. 初始化数据文档、数据库和存储位置。</p>
            <p>2. 部署核心服务的资源。这会稍微多花一点时间。</p>
        </div>

        <template #bottom>
            <Button type="primary" mode="light" icon="arrow-left" @click="$emit('prev')">上一步</Button>
            <Button class="float-right" type="primary" mode="filled" icon="check" @click="execute">确定</Button>
        </template>
    </BottomLayout>

    <BottomLayout v-else-if="initializeState === 'ERROR'">
        <h3 class="mb-4">错误</h3>
        <p>初始化过程失败。</p>
        <template #bottom>
            <Button type="primary" mode="light" icon="arrow-left" @click="$emit('prev')">上一步</Button>
        </template>
    </BottomLayout>

    <BottomLayout v-else-if="initializeState === 'FINISH'">
        <h3 class="mb-4">完成</h3>
        <div class="absolute center has-text-centered">
            <Icon icon="check" size="3x"/>
            <p class="mt-4">初始化已完成。点击继续开始使用。</p>
        </div>
        <template #bottom>
            <Button class="float-right" type="primary" mode="filled" icon="check" @click="finish">继续</Button>
        </template>
    </BottomLayout>

    <div v-else>
        <div class="absolute center has-text-centered">
            <Icon icon="code-branch" size="3x" fade/>
            <p class="mt-4">{{initializingMessage[initializeState] ?? ""}}</p>
        </div>
    </div>
</template>

<style module lang="sass">

</style>
