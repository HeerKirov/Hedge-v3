<script setup lang="ts">
import { computed, reactive, toRaw } from "vue"
import { Input, Select } from "@/components/form"
import { Button } from "@/components/universal"
import { useSettingBehaviour } from "@/services/setting"

const { data } = useSettingBehaviour()

const value = computed({
    get: () => data.value?.externalBrowser ?? "<default>",
    set: value => {
        if(data.value) data.value.externalBrowser = value === "<default>" ? null : value
    }
})

const items = computed(() => [
    ...internalBrowserList,
    ...(data.value?.customBrowserList ?? [])
].map(({ name, path }) => ({label: name, value: path})))

const addCustom = reactive({
    open: false,
    name: "",
    path: ""
})

const submitCustomBrowser = () => {
    if(data.value && addCustom.open && addCustom.name && items.value.findIndex(i => i.label === addCustom.name) < 0) {
        data.value = {
            customBrowserList: [...data.value.customBrowserList.map(i => toRaw(i)), {name: addCustom.name, path: addCustom.path || addCustom.name}],
            externalBrowser: addCustom.name
        }
        addCustom.open = false
        addCustom.name = ""
        addCustom.path = ""

    }
}

</script>

<script lang="ts">
import { platform } from "@/functions/ipc-client"

const internalBrowserList = [
    {name: "默认", path: "<default>"},
    {name: "Google Chrome", path: "chrome"},
    {name: "Microsoft Edge", path: "edge"},
    {name: "Firefox", path: "firefox"},
    {name: "Brave", path: "brave"},
    ...(platform === "darwin" ? [{name: "Safari", path: "safari"}] : []),
]

</script>

<template>
    <div>
        <div>
            <Select class="mr-1" :items v-model:value="value"/>
            <Button v-if="!addCustom.open" square icon="folder-open" @click="addCustom.open = true"/>
            <template v-else>
                <Input v-model:value="addCustom.name" placeholder="显示名称" auto-focus @enter="submitCustomBrowser"/>
                <Input v-model:value="addCustom.path" placeholder="访问路径"/>
                <Button class="ml-1" type="success" square icon="check" @click="submitCustomBrowser"/>
                <Button square icon="close" @click="addCustom.open = false"/>
            </template>
        </div>
        <span class="ml-1 secondary-text">{{addCustom.open ? "添加自定义浏览器。可以直接指定浏览器的名称短语以自行发现浏览器。" : "选择指定浏览器打开外部链接。"}}</span>
    </div>
</template>
