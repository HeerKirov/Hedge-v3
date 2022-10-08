<script setup lang="ts">
import { ref, watch } from "vue"
import { Block, Button, Icon } from "@/components/universal"
import { Input } from "@/components/form"
import { Group } from "@/components/layout"
import { useServerStatus } from "@/functions/app"
import { useSettingConnectionInfo, useSettingServiceData } from "@/services/setting"
import { usePropertySot } from "@/utils/forms"
import { toRefNullable } from "@/utils/reactivity"
import { PortType, validatePort } from "@/utils/validation"
import { sleep } from "@/utils/process"

const server = useServerStatus()
const serviceSetting = useSettingServiceData()

const { connectionInfo, connectionStatus } = useSettingConnectionInfo()

const [port, portSotFlag, savePort] = usePropertySot(toRefNullable(serviceSetting.data, "port"))

const portType = ref<PortType>("AUTO")
watch(port, async (v, _, onInvalidate) => {
    let validate = true
    onInvalidate(() => validate = false)
    await sleep(500)
    if(validate) {
        portType.value = validatePort(v ?? "")
    }
})
</script>

<template>
    <Block v-if="server !== undefined" class="p-3 mt-2">
        <p v-if="connectionStatus === 'OPEN'" class="has-text-success is-font-size-large">
            <Icon class="mr-2" icon="server"/>核心服务正在运行
        </p>
        <p v-else-if="connectionStatus === 'CONNECTING'" class="has-text-primary is-font-size-large">
            <Icon class="mr-2" icon="server"/>核心服务正在启动……
        </p>
        <p v-else-if="connectionStatus === 'CLOSE'" class="is-font-size-large">
            <Icon class="mr-2" icon="server"/>核心服务已关闭
        </p>
        <p v-else-if="connectionStatus === 'FAILED'" class="has-text-danger is-font-size-large">
            <Icon class="mr-2" icon="server"/>核心服务发生错误
        </p>
        <p class="mt-2 is-font-size-small">核心服务是一项独立的进程，在后台为整套Hedge应用提供功能服务。除App外，还可为命令行工具、插件提供服务。</p>
        <p class="is-font-size-small">Hedge会自己做好对核心服务的管理，通常不必关心这个进程。</p>
        <p v-if="!!connectionInfo" class="mt-2 is-font-size-small">
            <Icon class="mr-1" icon="bullseye"/>PID <code>{{connectionInfo.pid}}</code>
            <Icon class="mr-1" icon="ethernet"/>端口 <code>:{{connectionInfo.port}}</code>
        </p>
        <p v-if="!!connectionInfo" class="mt-1 is-font-size-small">
            <Icon class="mr-1" icon="business-time"/>已运行时长 <code>{{connectionInfo.runningTime}}</code>
        </p>
    </Block>
    <label class="mt-2 label">建议的端口</label>
    <Group class="mt-1">
        <Input v-model:value="port" size="small" placeholder="例如: 9000, 9090-9099" update-on-input/>
        <Button v-if="portSotFlag" mode="light" type="primary" square icon="save" size="small" @click="savePort"></Button>
    </Group>
    <p v-if="portType === 'AUTO'" class="secondary-text">由Hedge自动搜索可用的端口。</p>
    <p v-else-if="portType === 'RANGE'" class="secondary-text">在指定的范围中搜索可用的端口。</p>
    <p v-else-if="portType === 'ERROR'" class="secondary-text">无效的端口参数。请使用<code>,</code>和<code>-</code>等描述简单的端口或端口范围。</p>
    <p v-else class="secondary-text">使用端口<code>:{{portType}}</code>。</p>
</template>

<style module lang="sass">

</style>
