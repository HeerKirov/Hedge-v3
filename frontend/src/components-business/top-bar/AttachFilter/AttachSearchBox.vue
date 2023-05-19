<script setup lang="ts">
import { ElementPopupCallout } from "@/components/interaction"
import { computedAsync } from "@/utils/reactivity"
import { useOptionCacheStorage } from "./utils"
import { SearchTemplate } from "./template"
import AttachBaseButton from "./AttachBaseButton.vue"
import AttachSearchPicker from "./AttachSearchPicker.vue"

defineOptions({
    inheritAttrs: false
})

const props = defineProps<{
    value?: any
    template: SearchTemplate
}>()

const emit = defineEmits<{
    (e: "update:value", v: any | any[]): void
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

</script>

<template>
    <ElementPopupCallout :class="$style.root">
        <template v-slot="{ click }">
            <AttachBaseButton
                v-bind="$attrs"
                :class="$style.button"
                :items="templateOptions"
                :mode-in-buttons="template.modeInButtons ?? 'icon-and-label'"
                :display-style="template.displayStyle"
                disable-any-radius
                @click="click"
            />
        </template>
        <template #popup>
            <AttachSearchPicker :template="template" :value="value" @update:value="$emit('update:value', $event)"/>
        </template>
    </ElementPopupCallout>
</template>

<style module lang="sass">
@import "../../../styles/base/size"

//因被popupCallout包裹，需要单独处理按钮的边角，并使用disable-any-radius禁用掉组件自带的边角
.root:first-child .button
    border-top-left-radius: $radius-size-std
    border-bottom-left-radius: $radius-size-std

</style>
