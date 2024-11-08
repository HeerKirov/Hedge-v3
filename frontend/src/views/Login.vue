<script setup lang="ts">
import { onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { Button, Icon } from "@/components/universal"
import { Input } from "@/components/form"
import { useAppEnv, useAppState } from "@/functions/app"
import { useMessageBox } from "@/modules/message-box"

const router = useRouter()
const appEnv = useAppEnv()
const appState = useAppState()
const message = useMessageBox()

const useTouchId = ref(appEnv.canPromptTouchID)
const password = ref("")
const disabled = ref(false)

onMounted(async () => {
    if(appState.state.value !== "NOT_LOGIN") {
        await router.push({name: "Index"})
        return
    }
    if(useTouchId.value) {
        if(await appState.login({touchId: true})) {
            await router.push({name: "Index"})
        }else{
            useTouchId.value = false
        }
    }
})

const doLogin = async () => {
    disabled.value = true
    if(await appState.login({password: password.value})) {
        await router.push({name: "Index"})
    }else{
        disabled.value = false
        message.showOkMessage("prompt", "口令错误。")
    }
}

</script>

<template>
    <div :class="$style['top-bar']"/>
    <div class="fixed center has-text-centered">
        <template v-if="useTouchId">
            <Icon icon="fingerprint" size="3x" fade/>
            <p class="mt-6">正在通过Touch ID认证</p>
        </template>
        <template v-else>
            <Input class="has-text-centered" type="password" size="small" width="three-quarter" auto-focus v-model:value="password" @enter="doLogin"/>
            <Button class="ml-1" mode="filled" type="success" size="small" square icon="arrow-right" :disabled="disabled" @click="doLogin"/>
        </template>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.top-bar
    -webkit-app-region: drag
    position: fixed
    top: 0
    left: 0
    right: 0
    height: size.$title-bar-height
</style>