<script setup lang="ts">
import { computed } from "vue"
import { Block, Button } from "@/components/universal"
import { Select, Input, NumberInput } from "@/components/form"
import { Flex, Group } from "@/components/layout"
import { SourceAnalyseRule } from "@/functions/http-client/api/setting-import"
import { useSettingSite } from "@/services/setting"
import { useMessageBox } from "@/modules/message-box"
import { computedMutable } from "@/utils/reactivity"

const props = defineProps<{
    rule: SourceAnalyseRule
}>()

const emit = defineEmits<{
    (e: "update", rule: SourceAnalyseRule): void
    (e: "delete"): void
}>()

const message = useMessageBox()

const { data: sites } = useSettingSite()

const siteSelectItems = computed(() => sites.value?.map(s => ({label: s.title, value: s.name})) ?? [])

const hasSecondaryId = computed(() => content.value.site ? sites.value?.find(s => s.name === content.value.site)?.hasSecondaryId ?? false : false)

const content = computedMutable(() => ({...props.rule}))

const submit = () => {
    if(!content.value.site) {
        message.showOkMessage("prompt", "未选择站点。")
        return
    }else if(!content.value.regex.trim()) {
        message.showOkMessage("prompt", "正则表达式错误。", "正则表达式内容不能设置为空。")
        return
    }
    emit("update", {...content.value})
}

const trash = async () => {
    if(await message.showYesNoMessage("warn", "确定删除此规则吗？", "此操作不可撤回。")) {
        emit("delete")
    }
}

</script>

<template>
    <Block class="p-3">
        <label class="label mt-1">对应站点</label>
        <Select class="mt-1" :items="siteSelectItems" v-model:value="content.site"/>
        <label class="label mt-2">正则表达式</label>
        <Input class="mt-1" width="fullwidth" placeholder="用于匹配文件名的正则表达式" v-model:value="content.regex"/>
        <Flex class="mt-2" :spacing="4">
            <div>
                <label class="label">ID生成位置</label>
                <NumberInput class="mt-1" width="one-third" :min="0" v-model:value="content.idIndex"/>
            </div>
            <div v-if="hasSecondaryId">
                <label class="label">分P生成位置</label>
                <NumberInput class="mt-1" width="one-third" :min="0" v-model:value="content.secondaryIdIndex"/>
            </div>
        </Flex>
        <Group class="mt-3">
            <Button type="primary" icon="save" @click="submit">保存规则</Button>
            <Button type="danger" icon="trash" square @click="trash"/>
        </Group>
    </Block>
</template>
