<script setup lang="ts">
import { reactive } from "vue"
import { Block, Button, Separator } from "@/components/universal"
import { Input, CheckBox } from "@/components/form"
import { Flex, FlexItem } from "@/components/layout" 
import { SiteCreateForm } from "@/functions/http-client/api/setting"
import { useMessageBox } from "@/modules/message-box"
import { checkVariableName } from "@/utils/validation"

const emit = defineEmits<{
    (e: "create", form: SiteCreateForm): void
}>()

const message = useMessageBox()

const form = reactive({
    name: "",
    title: "",
    hasSecondaryId: false,
    availableAdditionalInfo: <{field: string, label: string}[]>[],
    sourceLinkGenerateRules: <string[]>[]
})

const submit = () => {
    if(!form.name.trim()) {
        message.showOkMessage("prompt", "站点名称错误。", "站点名称不能设置为空。")
        return
    }else if(form.name.length > 16) {
        message.showOkMessage("prompt", "站点名称错误。", "站点名称长度不能超过16。")
        return
    }else if(!form.title.trim()) {
        message.showOkMessage("prompt", "站点显示名称错误。", "站点显示名称不能设置为空。")
        return
    }
    for(const link of form.sourceLinkGenerateRules) {
        if(!link.trim()) {
            message.showOkMessage("prompt", "链接自动生成规则错误。", "链接自动生成规则不能设置为空。")
            return
        }
    }
    for(const { field, label } of form.availableAdditionalInfo) {
        if(!checkVariableName(field)) {
            message.showOkMessage("prompt", "附加信息条目字段名错误。", "字段名必须以大小写字母开头，且仅允许包含大小写字母、数字、下划线。")
            return
        }else if(!label.trim()) {
            message.showOkMessage("prompt", "附加信息条目显示名称错误。", "显示名称不能设置为空。")
            return
        }
    }
    emit("create", {...form})
    form.name = ""
    form.title = ""
    form.hasSecondaryId = false
    form.sourceLinkGenerateRules = []
    form.availableAdditionalInfo = []
}

const addAvailableAdditionalInfo = () => {
    form.availableAdditionalInfo.push({field: "", label: ""})
}

const addSourceLinkGenerateRule = () => {
    form.sourceLinkGenerateRules.push("")
}

const trashAvailableAdditionalInfo = (idx: number) => {
    form.availableAdditionalInfo.splice(idx, 1)
}

const trashSourceLinkGenerateRule = (idx: number) => {
    form.sourceLinkGenerateRules.splice(idx, 1)
}

</script>

<template>
    <Block class="p-2 relative">
        <Flex :spacing="1">
            <FlexItem :width="40">
                <div>
                    <label class="label">站点名称</label>
                    <Input class="mt-1" width="fullwidth" placeholder="站点名称" v-model:value="form.name"/>
                </div>
            </FlexItem>
            <FlexItem :width="60">
                <div>
                    <label class="label">站点显示名称</label>
                    <Input class="mt-1" width="fullwidth" placeholder="站点显示名称" v-model:value="form.title"/>
                </div>
            </FlexItem>
        </Flex>
        <div class="is-line-height-std"><CheckBox v-model:value="form.hasSecondaryId">启用二级ID</CheckBox></div>
        <Flex :spacing="1">
            <FlexItem :width="50">
                <div>
                    <label class="label">可用元数据字段</label>
                    <Flex v-for="(item, idx) in form.availableAdditionalInfo" class="mt-1 w-100" :spacing="1">
                        <FlexItem :width="100">
                            <Input size="small" placeholder="字段名" v-model:value="item.field"/>
                            <Input size="small" placeholder="显示名称" v-model:value="item.label"/>
                        </FlexItem>
                        <FlexItem :shrink="0">
                            <Button size="small" type="danger" icon="close" square @click="trashAvailableAdditionalInfo(idx)"/>
                        </FlexItem>
                    </Flex>
                    <Button class="mt-1 w-100" size="small" type="success" icon="plus" @click="addAvailableAdditionalInfo">添加</Button>
                </div>
            </FlexItem>
            <FlexItem :width="50">
                <div>
                    <label class="label">链接自动生成规则</label>
                    <Flex v-for="(item, idx) in form.sourceLinkGenerateRules" class="mt-1 w-100" :spacing="1">
                        <FlexItem :width="100">
                            <Input size="small" placeholder="规则" :value="item" @update:value="form.sourceLinkGenerateRules[idx] = $event"/>
                        </FlexItem>
                        <FlexItem :shrink="0">
                            <Button size="small" type="danger" icon="close" square @click="trashSourceLinkGenerateRule(idx)"/>
                        </FlexItem>
                    </Flex>
                    <Button class="mt-1 w-100" size="small" type="success" icon="plus" @click="addSourceLinkGenerateRule">添加</Button>
                </div>
            </FlexItem>
        </Flex>
        <Separator direction="horizontal"/>
        <Button class="mt-2" type="success" icon="plus" @click="submit">添加站点</Button>
    </Block>
</template>
