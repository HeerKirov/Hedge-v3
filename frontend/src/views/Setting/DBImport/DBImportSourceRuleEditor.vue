<script setup lang="ts">
import { computed } from "vue"
import { Block, Button, Separator, Icon } from "@/components/universal"
import { Select, Input, CheckBox } from "@/components/form"
import { Flex, FlexItem } from "@/components/layout"
import { SourceAnalyseRule, SourceAnalyseRuleExtraTarget } from "@/functions/http-client/api/setting"
import { useSettingSite } from "@/services/setting"
import { useMessageBox } from "@/modules/message-box"
import { computedMutable } from "@/utils/reactivity"
import { objects } from "@/utils/primitives"

const props = defineProps<{
    rule: SourceAnalyseRule
}>()

const emit = defineEmits<{
    (e: "update", rule: SourceAnalyseRule): void
    (e: "delete"): void
}>()

const message = useMessageBox()

const { data: sites } = useSettingSite()

const site = computed(() => content.value.site ? sites.value?.find(s => s.name === content.value.site) ?? null : null)

const siteSelectItems = computed(() => sites.value?.map(s => ({label: s.title, value: s.name})) ?? [])

const hasPart = computed(() => site.value?.partMode !== "NO" ?? false)

const hasPartName = computed(() => site.value?.partMode === "PAGE_WITH_NAME" ?? false)

const extraTargetItems: {label: string, value: SourceAnalyseRuleExtraTarget}[] = [
    {label: "标题", value: "TITLE"},
    {label: "描述", value: "DESCRIPTION"},
    {label: "附加信息*", value: "ADDITIONAL_INFO"},
    {label: "标签(编码)", value: "TAG"},
    {label: "画集(编码)", value: "BOOK"},
    {label: "关联项", value: "RELATION"},
]

const additionalInfoFields = computed(() => site.value?.availableAdditionalInfo.map(i => ({label: i.label, value: i.field})) ?? [])

const content = computedMutable(() => {
    const dep = objects.deepCopy(props.rule)
    return {...dep, extras: dep.extras ?? []}
})

const addExtra = () => {
    content.value.extras.push({group: "", target: "ADDITIONAL_INFO", optional: true, tagType: "", additionalInfoField: null})
}

const removeExtra = (idx: number) => {
    content.value.extras.splice(idx, 1)
}

const submit = () => {
    if(!content.value.site) {
        message.showOkMessage("prompt", "未选择站点。")
        return
    }else if(!content.value.regex.trim()) {
        message.showOkMessage("prompt", "正则表达式错误。", "正则表达式内容不能设置为空。")
        return
    }
    if(content.value.extras.some(extra => extra.target === "ADDITIONAL_INFO" && !extra.additionalInfoField)) {
        message.showOkMessage("prompt", "未选择附加信息字段。")
        return
    }
    const extras = content.value.extras.length ? content.value.extras.map(extra => ({
        ...extra,
        tagType: extra.target === "TAG" ? extra.tagType : null,
        additionalInfoField: extra.target === "ADDITIONAL_INFO" ? extra.additionalInfoField : null
    })) : null

    emit("update", {...content.value, extras})
}

const trash = async () => {
    if(await message.showYesNoMessage("warn", "确定删除此规则吗？", "此操作不可撤回。")) {
        emit("delete")
    }
}

</script>

<template>
    <Block class="p-2">
        <label class="label mt-2">正则表达式</label>
        <Input class="mt-1 is-monaco" width="fullwidth" placeholder="用于匹配文件名的正则表达式" v-model:value="content.regex"/>
        <Flex class="mt-2 mb-2" :spacing="4">
            <div>
                <label class="label">对应站点</label>
                <Select class="mt-1" :items="siteSelectItems" v-model:value="content.site"/>
            </div>
            <div>
                <label class="label">ID生成位置</label>
                <Input class="mt-1" width="one-third" v-model:value="content.idGroup"/>
            </div>
            <div v-if="hasPart">
                <label class="label">分页生成位置</label>
                <Input class="mt-1" width="one-third" v-model:value="content.partGroup"/>
            </div>
            <div v-if="hasPartName">
                <label class="label">页码生成位置</label>
                <Input class="mt-1" width="one-third" v-model:value="content.partNameGroup"/>
            </div>
        </Flex>
        <a class="float-right is-font-size-small has-text-success" @click="addExtra"><Icon class="mr-1" icon="plus"/>添加一项额外信息</a>
        <label class="label">提取额外信息</label>
        <div v-if="content.extras.length <= 0" class="has-text-centered secondary-text mb-2"><i>无额外信息</i></div>
        <Flex v-for="(extra, idx) in content.extras" class="mt-1" :spacing="1">
            <FlexItem>
                <Input width="fullwidth" placeholder="信息生成位置" v-model:value="extra.group"/>
            </FlexItem>
            <FlexItem>
                <Select :items="extraTargetItems" v-model:value="extra.target"/>
                <Select v-if="extra.target === 'ADDITIONAL_INFO'" :items="additionalInfoFields" v-model:value="extra.additionalInfoField"/>
                <Input v-else-if="extra.target === 'TAG'" width="fullwidth" placeholder="标签类型(可选)" v-model:value="extra.tagType"/>
            </FlexItem>
            <FlexItem :shrink="0">
                <div class="is-line-height-std pl-1">
                    <CheckBox v-model:value="extra.optional">可选</CheckBox>
                </div>
                <Button type="danger" icon="close" square @click="removeExtra(idx)"/>
            </FlexItem>
        </Flex>
        <Separator class="mt-2" direction="horizontal"/>
        <div class="mt-2">
            <Button type="primary" icon="save" @click="submit">保存规则</Button>
            <Button class="float-right" type="danger" icon="trash" square @click="trash"/>
        </div>
    </Block>
</template>
