<script setup lang="ts">
import { Block, Button, Icon } from "@/components/universal"
import { windowManager } from "@/modules/window"
import { useServerStatus } from "@/functions/app"
import { computedMutable } from "@/utils/reactivity"

const serverStatus = useServerStatus()

const status = computedMutable(() => {
    if(serverStatus.value.connectionStatus === "FAILED" || serverStatus.value.connectionStatus === "CLOSE") {
        return "DISCONNECT"
    }else if(serverStatus.value.connectionStatus === "CONNECTING") {
        return "CONNECTING"
    }else{
        return "OK"
    }
})

</script>

<template>
    <template v-if="status === 'DISCONNECT'">
        <div :class="$style.background"/>
        <Block class="absolute center px-6 py-4 has-text-centered" mode="shadow" color="danger">
            <p class="is-font-size-large"><b>已失去与核心服务的连接</b></p>
            <p class="is-font-size-large my-2"><Icon icon="plug-circle-xmark" size="2x"/></p>
            <p>请尝试检修核心服务。</p>
            <ul class="is-font-size-small">
                <li>打开设置页面，检查核心服务的详细状态;</li>
                <li>重启应用程序，以重置可能的错误状态;</li>
                <li>如果核心服务以远程模式部署，检查核心服务的部署与可用状态。</li>
            </ul>
            <div class="mt-4">
                <Button icon="gear" @click="windowManager.openSetting">打开设置</Button>
                <Button icon="close" @click="status = 'OK'">关闭提示</Button>
            </div>
        </Block>
    </template>
    <Block v-else-if="status === 'CONNECTING'" class="absolute bottom p-4 mb-8" color="warning">
        <Icon class="mr-2" icon="circle-notch" spin/>正在连接核心服务……
    </Block>
</template>

<style module lang="sass">
.background
    position: fixed
    left: 0
    top: 0
    width: 100%
    height: 100%
    backdrop-filter: blur(10px)
</style>