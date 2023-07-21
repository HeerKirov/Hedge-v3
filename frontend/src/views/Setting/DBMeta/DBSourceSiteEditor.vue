<script setup lang="ts">
import { Block, Button, Separator } from "@/components/universal"
import { Input, CheckBox } from "@/components/form"
import { Flex, FlexItem } from "@/components/layout"
import { Site, SiteUpdateForm } from "@/functions/http-client/api/setting"
import { useMessageBox } from "@/modules/message-box"
import { computedMutable } from "@/utils/reactivity"
import { checkVariableName } from "@/utils/validation"

const props = defineProps<Site & { ordinal: number }>()

const emit = defineEmits<{
    (e: "update", form: SiteUpdateForm): void
    (e: "delete"): void
}>()

const message = useMessageBox()

const content = computedMutable(() => ({
    title: props.title,
    sourceLinkGenerateRules: props.sourceLinkGenerateRules,
    availableAdditionalInfo: props.availableAdditionalInfo
}))

const submit = () => {
    if(!content.value.title.trim()) {
        message.showOkMessage("prompt", "站点显示名称错误。", "站点显示名称不能设置为空。")
        return
    }
    for(const link of content.value.sourceLinkGenerateRules) {
        if(!link.trim()) {
            message.showOkMessage("prompt", "链接自动生成规则错误。", "链接自动生成规则不能设置为空。")
            return
        }
    }
    for(const { field, label } of content.value.availableAdditionalInfo) {
        if(!checkVariableName(field)) {
            message.showOkMessage("prompt", "附加信息条目字段名错误。", "字段名必须以大小写字母开头，且仅允许包含大小写字母、数字、下划线。")
            return
        }else if(!label.trim()) {
            message.showOkMessage("prompt", "附加信息条目显示名称错误。", "显示名称不能设置为空。")
            return
        }
    }
    emit("update", {...content.value})
}

const trash = async () => {
    if(await message.showYesNoMessage("warn", "确定删除此站点吗？", "此操作不可撤回。")) {
        emit("delete")
    }
}

const addAvailableAdditionalInfo = () => {
    content.value.availableAdditionalInfo.push({field: "", label: ""})
}

const addSourceLinkGenerateRule = () => {
    content.value.sourceLinkGenerateRules.push("")
}

const trashAvailableAdditionalInfo = (idx: number) => {
    content.value.availableAdditionalInfo.splice(idx, 1)
}

const trashSourceLinkGenerateRule = (idx: number) => {
    content.value.sourceLinkGenerateRules.splice(idx, 1)
}

</script>

<template>
    <Block class="p-2 relative">
        <Flex :spacing="1">
            <FlexItem :width="40">
                <div>
                    <label class="label">站点名称</label>
                    <Input class="mt-1" width="fullwidth" placeholder="站点名称" :value="name" disabled/>
                </div>
            </FlexItem>
            <FlexItem :width="60">
                <div>
                    <label class="label">站点显示名称</label>
                    <Input class="mt-1" width="fullwidth" placeholder="站点显示名称" v-model:value="content.title"/>
                </div>
            </FlexItem>
        </Flex>
        <div class="is-line-height-std"><CheckBox :value="hasSecondaryId" disabled>启用二级ID</CheckBox></div>
        <Flex :spacing="1">
            <FlexItem :width="50">
                <div>
                    <label class="label">可用元数据字段</label>
                    <Flex v-for="(item, idx) in content.availableAdditionalInfo" class="mt-1 w-100" :spacing="1">
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
                    <Flex v-for="(item, idx) in content.sourceLinkGenerateRules" class="mt-1 w-100" :spacing="1">
                        <FlexItem :width="100">
                            <Input size="small" placeholder="规则" :value="item" @update:value="content.sourceLinkGenerateRules[idx] = $event"/>
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
        <div class="mt-2">
            <Button type="primary" icon="save" @click="submit">保存更改</Button>
            <Button class="float-right" type="danger" icon="trash" square @click="trash"/>
        </div>
    </Block>
</template>
