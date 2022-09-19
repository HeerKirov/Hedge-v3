<script setup lang="ts">
import { computed, watch } from "vue"
import { useRouter } from "vue-router"
import { Icon } from "@/components/universal"
import { useAppState } from "@/functions/app"
import { useNewWindowRouteReceiver } from "@/services/module/router"

const router = useRouter()
const { state } = useAppState()
const { receiveRoute } = useNewWindowRouteReceiver()

const loading = computed(() => state.value === "LOADING" || state.value === "LOADING_RESOURCE" || state.value === "LOADING_SERVER")

watch(state, async () => {
    if(state.value === "NOT_INITIALIZED") {
        //如果处于未初始化的状态，跳转到init
        await router.push({name: "Init"})
    }else if(state.value === "NOT_LOGIN") {
        //如果处于未登录的状态，跳转到login
        await router.push({name: "Login"})
    }else if(state.value === "READY") {
        //已经加载的状态，则首先查看是否存在route navigator参数
        const navigated = receiveRoute()
        //最后，默认跳转到main home首页
        if(!navigated) {
            await router.push({name: "MainHome"})
        }
    }
}, {immediate: true})

const loadingMessage: Record<string, string> = {
    "LOADING_RESOURCE": "正在更新…",
    "LOADING_SERVER": "正在启动服务…"
}

</script>

<template>
    <div v-if="loading" class="fixed center has-text-centered">
        <Icon icon="circle-notch" size="3x" spin/>
        <p class="mt-4">{{loadingMessage[state] ?? ""}}</p>
    </div>
</template>
