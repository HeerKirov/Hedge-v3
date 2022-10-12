<script setup lang="ts">
import { computed } from "vue"
import { SearchPickList } from "@/components/data"
import { Tag } from "@/components/universal"
import { Group } from "@/components/layout"
import { HttpClient, mapResponse, mapListResult } from "@/functions/http-client"
import { Colors } from "@/constants/ui"
import { computedAsync } from "@/utils/reactivity"
import { useOptionCacheStorage } from "./utils"
import { SearchTemplate, TemplateOption } from "./template"

const props = defineProps<{
    template: SearchTemplate
    value?: any
}>()

const emit = defineEmits<{
    (e: "update:value", value: any | any [] | undefined): void
}>()

const optionCacheStorage = useOptionCacheStorage()

const templateOptions = computedAsync([], async () => {
    if(props.template.multiSelection) {
        const values = props.value as (any[] | undefined) ?? []
        return await Promise.all(values.map(value => optionCacheStorage[props.template.field].get(value)))
    }else{
        return props.value !== undefined ? [await optionCacheStorage[props.template.field].get(props.value)] : []
    }
})

//Attach Search Picker在使用SearchPickList时，总是使用TemplateOption作为其item的类型.
const pickProps = {
    query: props.template.query && (props.template.mapQuery ? (client: HttpClient) => {
        const method = props.template.query!(client)
        return async (offset: number, limit: number, search: string) => mapResponse(await method(offset, limit, search), d => mapListResult(d, props.template.mapQuery!))
    } : props.template.query),
    historyList: props.template.history && (props.template.history.mapList ? (client: HttpClient) => {
        const method = props.template.history!.list(client)
        return async (limit: number) => mapResponse(await method(limit), d => d.map(props.template.history!.mapList!))
    } : props.template.history.list),
    historyPush: props.template.history?.push,
    mapOption: (item: TemplateOption) => ({label: item.label, value: `${item.value}`}),
    onPick: (item: TemplateOption) => {
        optionCacheStorage[props.template.field].update(item)
        if(props.template.multiSelection) {
            const values = props.value as (any[] | undefined) ?? []
            if(values.indexOf(item.value) === -1) {
                emit("update:value", [...values, item.value])
            }
        }else{
            emit("update:value", item.value)
        }
    }
}

const removeItem = (index: number) => {
    if(props.template.multiSelection) {
        const values = props.value as (any[] | undefined) ?? []
        if(values.length <= 1) {
            emit("update:value", undefined)
        }else{
            emit("update:value", [...values.slice(0, index), ...values.slice(index + 1)])
        }
    }else{
        emit("update:value", undefined)
    }
}

const tagLineStyle = computed(() => props.template.displayStyle === "normal" || props.template.displayStyle === undefined ? "none" : undefined)
const tagBrackets = computed(() => props.template.displayStyle === "annotation" ? "[]" : undefined)

</script>

<template>
    <div :class="$style.root">
        <Group class="is-font-size-small">
            <Tag v-for="(item, index) in templateOptions"
                 :line-style="tagLineStyle"
                 :brackets="tagBrackets"
                 :color="(item.color as Colors)"
                 :icon="template.modeInButtons !== 'label-only' ? item.icon : undefined"
                 tail-icon="close"
                 clickable @click="removeItem(index)">
                {{template.modeInButtons !== 'icon-only' ? item.label : undefined}}
            </Tag>
        </Group>
        <SearchPickList v-bind="pickProps" auto-focus v-slot="{ item }">
            <Tag :line-style="tagLineStyle"
                 :brackets="tagBrackets"
                 :color="(item.color as Colors)"
                 :icon="template.modeInButtons !== 'label-only' ? item.icon : undefined">
                {{template.modeInButtons !== 'icon-only' ? item.label : undefined}}
            </Tag>
        </SearchPickList>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/size"

.root
    max-width: 450px
    min-width: 250px
    max-height: 450px
    padding: $spacing-2
</style>
