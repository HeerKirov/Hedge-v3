<script setup lang="ts">
import { computed, watch } from "vue"
import { useRouter } from "vue-router"
import { Icon } from "@/components/universal"
import { useAppState } from "@/functions/app"

const router = useRouter()
const { state } = useAppState()

const loading = computed(() => state.value === "LOADING" || state.value === "LOADING_RESOURCE" || state.value === "LOADING_SERVER")

watch(state, async () => {
    if(state.value === "NOT_INITIALIZED") {
        //如果处于未初始化的状态，跳转到init
        await router.push({name: "Init"})
    }else if(state.value === "NOT_LOGIN") {
        //如果处于未登录的状态，跳转到login
        await router.push({name: "Login"})
    }else if(state.value === "READY") {
        await router.push({name: "Main"})
    }
}, {immediate: true})

const loadingMessage: Record<string, string> = {
    "LOADING_RESOURCE": "正在更新…"
}

</script>

<template>
    <div v-if="loading" class="fixed center has-text-centered">
        <Icon icon="circle-notch" size="3x" spin/>
    </div>
    <p v-if="loading" class="fixed bottom mb-4">{{loadingMessage[state] ?? ""}}</p>
</template>
