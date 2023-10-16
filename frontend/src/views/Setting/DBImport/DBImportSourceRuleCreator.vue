<script setup lang="ts">
import { reactive, computed } from "vue"
import { Block, Button, Separator, Icon } from "@/components/universal"
import { CheckBox, Input, Select } from "@/components/form"
import { Flex, FlexItem } from "@/components/layout"
import { SourceAnalyseRule, SourceAnalyseRuleExtra, SourceAnalyseRuleExtraTarget } from "@/functions/http-client/api/setting"
import { useSettingSite } from "@/services/setting"
import { useMessageBox } from "@/modules/message-box"

const emit = defineEmits<{
    (e: "create", v: SourceAnalyseRule): void
}>()

const message = useMessageBox()

const { data: sites } = useSettingSite()

const site = computed(() => form.site ? sites.value?.find(s => s.name === form.site) ?? null : null)

const siteSelectItems = computed(() => sites.value?.map(s => ({label: s.title, value: s.name})) ?? [])

const hasPart = computed(() => site.value?.partMode !== "NO" ?? false)

const hasPartName = computed(() => site.value?.partMode === "PAGE_WITH_NAME" ?? false)

const form = reactive({
    site: undefined as string | undefined,
    regex: "",
    idGroup: "1",
    partGroup: "2",
    partNameGroup: "3",
    extras: <SourceAnalyseRuleExtra[]>[]
})

const extraTargetItems: {label: string, value: SourceAnalyseRuleExtraTarget}[] = [
    {label: "标题", value: "TITLE"},
    {label: "描述", value: "DESCRIPTION"},
    {label: "附加信息*", value: "ADDITIONAL_INFO"},
    {label: "标签(编码)", value: "TAG"},
    {label: "画集(编码)", value: "BOOK"},
    {label: "关联项", value: "RELATION"},
]

const additionalInfoFields = computed(() => site.value?.availableAdditionalInfo.map(i => ({label: i.label, value: i.field})) ?? [])

const addExtra = () => {
    form.extras.push({group: "", target: "ADDITIONAL_INFO", optional: true, translateUnderscoreToSpace: false, tagType: "", additionalInfoField: ""})
}

const removeExtra = (idx: number) => {
    form.extras.splice(idx, 1)
}

const submit = () => {
    if(!form.site) {
        message.showOkMessage("prompt", "未选择站点。")
        return
    }else if(!form.regex.trim()) {
        message.showOkMessage("prompt", "正则表达式错误。", "正则表达式内容不能设置为空。")
        return
    }
    if(form.extras.some(extra => extra.target === "ADDITIONAL_INFO" && !extra.additionalInfoField)) {
        message.showOkMessage("prompt", "未选择附加信息字段。")
        return
    }
    const extras = form.extras.length ? form.extras.map(extra => ({
        ...extra,
        tagType: extra.target === "TAG" ? extra.tagType : null,
        additionalInfoField: extra.target === "ADDITIONAL_INFO" ? extra.additionalInfoField : null
    })) : null

    emit("create", {
        site: form.site,
        regex: form.regex,
        idGroup: form.idGroup,
        partGroup: hasPart.value && form.partGroup ? form.partGroup : null,
        partNameGroup: hasPartName.value && form.partNameGroup ? form.partNameGroup : null,
        extras
    })

    form.regex = ""
    form.idGroup = "1"
    form.partGroup = "2"
    form.partNameGroup = "3"
    form.extras = []
}

</script>

<template>
    <Block class="p-2">
        <label class="label mt-2">正则表达式</label>
        <Input class="mt-1 is-monaco" width="fullwidth" placeholder="用于匹配文件名的正则表达式" v-model:value="form.regex"/>
        <Flex class="mt-2 mb-2" :spacing="4">
            <div>
                <label class="label">对应站点</label>
                <Select class="mt-1" :items="siteSelectItems" v-model:value="form.site"/>
            </div>
            <div>
                <label class="label">ID生成位置</label>
                <Input class="mt-1" width="one-third" v-model:value="form.idGroup"/>
            </div>
            <div v-if="hasPart">
                <label class="label">分页生成位置</label>
                <Input class="mt-1" width="one-third" v-model:value="form.partGroup"/>
            </div>
            <div v-if="hasPartName">
                <label class="label">页码生成位置</label>
                <Input class="mt-1" width="one-third" v-model:value="form.partNameGroup"/>
            </div>
        </Flex>
        <a class="float-right is-font-size-small has-text-success" @click="addExtra"><Icon class="mr-1" icon="plus"/>添加一项额外信息</a>
        <label class="label">提取额外信息</label>
        <div v-if="form.extras.length <= 0" class="has-text-centered secondary-text mb-2"><i>无额外信息</i></div>
        <Flex v-for="(extra, idx) in form.extras" class="mt-1" :spacing="1">
            <FlexItem>
                <Input width="fullwidth" placeholder="信息生成位置" v-model:value="extra.group"/>
            </FlexItem>
            <FlexItem>
                <Select :items="extraTargetItems" v-model:value="extra.target"/>
                <Select v-if="extra.target === 'ADDITIONAL_INFO'" :items="additionalInfoFields" v-model:value="extra.additionalInfoField"/>
                <Input v-else-if="extra.target === 'TAG'" width="fullwidth" placeholder="标签类型(可选)" v-model:value="extra.tagType"/>
            </FlexItem>
            <FlexItem :shrink="0">
                <div class="is-line-height-std">
                    <CheckBox class="pl-1" v-model:value="extra.optional">可选</CheckBox>
                    <CheckBox class="pl-1" v-model:value="extra.translateUnderscoreToSpace">下划线转空格</CheckBox>
                </div>
                <Button type="danger" icon="close" square @click="removeExtra(idx)"/>
            </FlexItem>
        </Flex>
        <Separator class="mt-2" direction="horizontal"/>
        <div class="mt-2">
            <Button type="success" icon="plus" @click="submit">添加规则</Button>
        </div>
    </Block>
</template>
