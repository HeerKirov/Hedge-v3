<script setup lang="ts">
import { ref } from "vue"
import { Starlight, Button, Separator } from "@/components/elements"
import { Input, NumberInput, RangeInput, CheckBox, Select } from "@/components/forms"
import { Group } from "@/components/layouts"
import { installAppService } from "@/functions/app"
import { installGlobalKey } from "@/services/module/keyboard"

//
// installAppService({
//     handleError(title, message) {
//         console.error(`${title}: ${message}`)
//     }
// })

installGlobalKey()

const value = ref<string>("默认值")
const numValue = ref<number>(1)
const rangeValue = ref<number>(15)
const checkBoxValue = ref(true)
const selectValue = ref<string>()

const selectItems = [
    { label: "北京", value: "beijing"},
    { label: "上海", value: "shanghai"},
    { label: "广州", value: "guangzhou"},
]

</script>

<template>
    <div class="gap-button">
        <Button icon="star-half">测试按钮</Button>
        <Button type="primary" icon="star">测试按钮</Button>
        <Button type="success" icon="star-half">测试按钮</Button>
        <Button type="danger" icon="star-half">测试按钮</Button>
        <Button type="primary" disabled icon="star-half">测试按钮</Button>
    </div>
    <div class="gap-button">
        <Button mode="light" icon="star-half">测试按钮</Button>
        <Button mode="light" type="primary" icon="star">测试按钮</Button>
        <Button mode="light" type="success" icon="star-half">测试按钮</Button>
        <Button mode="light" type="danger" icon="star-half">测试按钮</Button>
        <Button mode="light" type="primary" disabled icon="star-half">测试按钮</Button>
    </div>
    <div class="gap-button">
        <Button mode="filled" icon="star-half">测试按钮</Button>
        <Button mode="filled" type="primary" icon="star">测试按钮</Button>
        <Button mode="filled" type="success" icon="star-half">测试按钮</Button>
        <Button mode="filled" type="danger" icon="star-half">测试按钮</Button>
        <Button mode="filled" type="primary" disabled icon="star-half">测试按钮</Button>
    </div>
    <div class="is-font-size-small gap-button">
        <Button mode="light" type="primary" size="small" icon="star">测试按钮</Button>
        你好，世界
    </div>
    <div class="is-font-size-std gap-button">
        <Button mode="light" type="primary" size="std" icon="star">测试按钮</Button>
        你好，世界
    </div>
    <div class="is-font-size-large gap-button">
        <Button mode="light" type="primary" size="large" icon="star">测试按钮</Button>
        你好，世界
    </div>
    <div class="gap-button">
        <Button mode="light" type="primary" square icon="star"></Button>
        <Button mode="light" type="primary" square round icon="star"></Button>
        <Button mode="light" type="primary" round icon="star">测试按钮</Button>
        你好，世界
    </div>
    <div>
        <Button mode="light" icon="star">测试按钮</Button>
        <Button mode="light" square icon="star"></Button>
        <Separator/>
        <Button mode="light" square icon="star"></Button>
        你好，世界
    </div>
    <div>
        <Starlight :value="5" show-text/>
        <Starlight :value="3" show-text/>
        <Starlight :value="1" show-text/>
        <Starlight :value="3.1" show-text/>
    </div>
    <div>
        <Input v-model:value="value" placeholder="placeholder..." focus-on-keypress="Meta+KeyK"/>
        <Button class="mx-1" mode="light" type="primary" icon="star">测试按钮</Button>
        <span>{{value}}</span>
    </div>
    <div>
        <NumberInput v-model:value="numValue" placeholder="placeholder..." :min="0" :max="12"/>
        <Button class="mx-1" mode="light" type="primary" icon="star">测试按钮</Button>
        <span>{{numValue}}</span>
    </div>
    <div>
        <Input type="textarea" rows="2"/>
    </div>
    <div>
        <RangeInput :max="100" :min="0" :step="1" v-model:value="rangeValue"/>
        <span>{{rangeValue}}</span>
    </div>
    <div>
        <CheckBox v-model:value="checkBoxValue">测试复选框</CheckBox>
        <Button class="mx-1" mode="light" type="primary" icon="star">测试按钮</Button>
        <span class="ml-1">{{checkBoxValue}}</span>
    </div>
    <div>
        <Select v-model:value="selectValue" :items="selectItems"/>
        <Button class="mx-1" mode="light" type="primary" icon="star">测试按钮</Button>
        <span class="ml-1">{{selectValue}}</span>
    </div>
    <div>
        <Group>
            <Button mode="light" type="primary" icon="star">测试按钮</Button>
            <Button mode="light" type="success" icon="star-half">测试按钮</Button>
            <Button mode="light" type="danger" icon="star-half">测试按钮</Button>
            <Button mode="light" type="primary" disabled icon="star-half">测试按钮</Button>
        </Group>
    </div>
</template>

<style lang="sass">
div.gap-button > button
    margin-right: 0.25rem
    margin-top: 0.25rem
</style>
