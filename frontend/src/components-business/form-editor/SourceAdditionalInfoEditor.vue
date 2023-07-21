<script setup lang="ts">
import { computed } from "vue"
import { Input } from "@/components/form"
import { Flex, FlexItem } from "@/components/layout"
import { SourceAdditionalInfo } from "@/functions/http-client/api/source-data"
import { useSettingSite } from "@/services/setting"

const props = defineProps<{
    site: string | null
    value?: SourceAdditionalInfo[]
}>()

const emit = defineEmits<{
    (e: "update:value", value: SourceAdditionalInfo[]): void
}>()

const { data: sites } = useSettingSite()
const fields = computed(() => props.site && sites.value ? sites.value.find(s => s.name === props.site)?.availableAdditionalInfo : undefined)
const values = computed(() => fields.value?.map(field => {
    const v = props.value?.find(i => i.field === field.field)
    return {field: field.field, label: field.label, value: v?.value ?? ""}
}))

const set = (field: string, value: string) => {
    const newValue = values.value?.map(v => v.field === field ? {field: v.field, label: v.label, value} : v) ?? []
    emit("update:value", newValue)
}

</script>

<template>
    <template v-if="values !== undefined && values.length > 0">
        <Flex v-for="v in values" class="mt-1" :spacing="1">
            <FlexItem :width="20">
                <div class="is-line-height-small">{{ v.label }}</div>
            </FlexItem>
            <FlexItem :width="80">
                <Input size="small" width="fullwidth" :value="v.value" @update:value="set(v.field, $event)"/>
            </FlexItem>
        </Flex>
    </template>
    <div v-else class="has-text-centered secondary-text">
        <i>此类型的站点未配置附加信息</i>
    </div>
</template>
