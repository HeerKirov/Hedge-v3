<script setup lang="ts">
import { reactive, computed } from "vue"
import { Block, Button } from "@/components/universal"
import { Input, NumberInput, Select } from "@/components/form"
import { Flex } from "@/components/layout"
import { SourceAnalyseRule } from "@/functions/http-client/api/setting-import"
import { useSettingSite } from "@/services/api/setting"
import { useMessageBox } from "@/services/module/message-box"

const emit = defineEmits<{
    (e: "create", v: SourceAnalyseRule): void
}>()

const message = useMessageBox()

const { data: sites } = useSettingSite()

const siteSelectItems = computed(() => sites.value?.map(s => ({label: s.title, value: s.name})) ?? [])

const hasSecondaryId = computed(() => form.site ? sites.value?.find(s => s.name === form.site)?.hasSecondaryId ?? false : false)

const form = reactive({
    site: undefined as string | undefined,
    regex: "",
    idIndex: 1,
    secondaryIdIndex: 2
})

const submit = () => {
    if(!form.site) {
        message.showOkMessage("prompt", "未选择站点。")
        return
    }else if(!form.regex.trim()) {
        message.showOkMessage("prompt", "正则表达式错误。", "正则表达式内容不能设置为空。")
        return
    }
    emit("create", {
        site: form.site,
        regex: form.regex,
        idIndex: form.idIndex,
        secondaryIdIndex: hasSecondaryId.value ? form.secondaryIdIndex : null
    })
    form.regex = ""
    form.idIndex = 1
    form.secondaryIdIndex = 2
}

</script>

<template>
    <Block class="p-3">
        <label class="label mt-1">对应站点</label>
        <Select class="mt-1" :items="siteSelectItems" v-model:value="form.site"/>
        <label class="label mt-2">正则表达式</label>
        <Input class="mt-1" width="fullwidth" placeholder="用于匹配文件名的正则表达式" v-model:value="form.regex"/>
        <Flex class="mt-2" :spacing="4">
            <div>
                <label class="label">ID生成位置</label>
                <NumberInput class="mt-1" width="one-third" :min="0" v-model:value="form.idIndex"/>
            </div>
            <div v-if="hasSecondaryId">
                <label class="label">分P生成位置</label>
                <NumberInput class="mt-1" width="one-third" :min="0" v-model:value="form.secondaryIdIndex"/>
            </div>
        </Flex>
        <Button class="mt-3" type="success" icon="plus" @click="submit">添加规则</Button>
    </Block>
</template>