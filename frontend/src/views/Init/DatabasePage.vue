<script setup lang="ts">
import { reactive } from "vue"
import { Button } from "@/components/universal"
import { Input, CheckBox } from "@/components/form"
import { BottomLayout } from "@/components/layout"
import { useMessageBox } from "@/modules/message-box"
import { dialogManager } from "@/modules/dialog"

const props = defineProps<{
    customLocation: boolean
    storagePath: string
}>()

const emit = defineEmits<{
    (e: "submit", customLocation: boolean, storagePath: string, remoteMode: boolean, remoteHost: string, remoteToken: string): void
}>()

const message = useMessageBox()

const data = reactive({
    remoteMode: false,
    customLocation: props.customLocation,
    storagePath: props.storagePath,
    remoteHost: "",
    remoteToken: ""
})

const submit = async () => {
    if(data.remoteMode) {
        if(data.remoteHost.trim() === "" || data.remoteToken.trim() === "") {
            message.showOkMessage("prompt", "连接地址和Token不能留空。")
            return
        }
        const err = await requestForConnectTest()
        if(err) {
            message.showOkMessage("error", "联通测试未成功。", err)
            return
        }
        emit("submit", false, "", true, data.remoteHost, data.remoteToken)
    }else{
        if(data.customLocation) {
            if(data.storagePath.trim() === "") {
                message.showOkMessage("prompt", "存储位置不能设置为空。", "如果不想使用自定义存储位置，请选择“使用默认存储位置”。")
                return
            }
        }
        emit("submit", data.customLocation, data.storagePath, false, "", "")
    }
}

const selectCustomLocation = async () => {
    const location = await dialogManager.openDialog({
        title: "选择存储位置",
        properties: ["openDirectory", "createDirectory"]
    })
    if(location) {
        data.storagePath = location[0]
    }
}

const connectTest = async () => {
    const err = await requestForConnectTest()
    if(err) message.showOkMessage("error", "联通测试未成功。", err)
    else message.showOkMessage("prompt", "服务器联通测试成功。")
}

const requestForConnectTest = async(): Promise<undefined | string> => {
    try {
        const res = await fetch(`http://${data.remoteHost}/app/health`, {
            headers: {
                "Authorization": `Bearer ${data.remoteToken}`,
                "Content-Type": "application/json"
            }
        })
        if(res.ok) {
            return undefined
        }else{
            const json = await res.json()
            return json.message
        }
    }catch(e) {
        return e!.toString()
    }
}

</script>

<template>
    <BottomLayout>
        <h3 class="mb-4">选择存储位置</h3>
        <template v-if="data.remoteMode">
            <p class="mb-2">Hedge服务端可独立部署在任意远程位置(局域网最优)。输入已部署的远程服务器地址，连接到远程服务。</p>
            <label class="label mt-2">连接地址</label>
            <Input placeholder="localhost:9000" v-model:value="data.remoteHost"/>
            <label class="label mt-2">连接Token</label>
            <Input placeholder="XXX" v-model:value="data.remoteToken"/>
            <p class="mt-2"><a @click="connectTest">联通测试</a></p>
        </template>
        <template v-else>
            <p class="mb-2">Hedge默认将文件存放于程序存储目录下。使用默认位置，或者选择一个自定义位置。</p>
            <CheckBox v-model:value="data.customLocation">使用自定义位置</CheckBox>
            <template v-if="data.customLocation">
                <label class="label mt-2">自定义位置</label>
                <Input v-model:value="data.storagePath"/>
                <Button class="ml-1" mode="filled" type="primary" square icon="file" @click="selectCustomLocation"/>
                <p class="mt-1 secondary-text">自定义存储位置不在Hedge的托管范围内，需要确保该位置可用且可访问，否则存储相关功能是无效的。</p>
            </template>
            <p v-else class="mt-2 secondary-text">现在使用默认存储位置。</p>
        </template>
        <template #bottom>
            <a class="is-line-height-std" @click="data.remoteMode = !data.remoteMode">{{ data.remoteMode ? '使用本地存储' : '连接到远程服务器' }}</a>
            <Button class="float-right" type="primary" mode="filled" icon="arrow-right" @click="submit">下一步</Button>
        </template>
    </BottomLayout>
</template>
