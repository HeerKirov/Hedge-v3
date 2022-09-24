<script setup lang="ts">
import { generateOrder, installOptionCacheStorage } from "./utils"
import { AttachTemplate, TemplateOption } from "./template"
import AttachCheckBox from "./AttachCheckBox.vue"
import AttachRadioBox from "./AttachRadioBox.vue"
import AttachSearchBox from "./AttachSearchBox.vue"
import AttachFilterButton from "./AttachFilterButton.vue"

const props = defineProps<{
    templates?: AttachTemplate[]
    value?: {[field: string]: any}
}>()

const emit = defineEmits<{
    (e: "update:value", value: {[field: string]: any}): void
}>()

const setValue = (field: string, value: any) => emit("update:value", {...(props.value ?? {}), [field]: value})

const clear = () => {
    const value = {...props.value} ?? {}
    if(props.templates) {
        for(const template of props.templates) {
            if(template.type === "order") {
                value["order"] = generateOrder(template.defaultValue, template.defaultDirection)
            }else if(template.type !== "separator" && template.field in value) {
                delete value[template.field]
            }
        }
    }
    emit("update:value", value)
}

installOptionCacheStorage(props.templates ?? [])

</script>

<template>
    <div :class="$style.root">
        <template v-for="template in templates">
            <template v-if="template.type === 'checkbox'">
                <template v-if="value?.[template.field]">
                    <AttachCheckBox :label="template.label" :icon="template.icon" :color="template.color" :mode-in-buttons="template.modeInButtons" :display-style="template.displayStyle" @cancel="setValue(template.field, undefined)"/>
                </template>
            </template>
            <template v-else-if="template.type === 'radio'">
                <template v-if="value?.[template.field] !== undefined">
                    <AttachRadioBox :value="(value[template.field] as string)" :options="template.options" :mode-in-buttons="template.modeInButtons" :display-style="template.displayStyle" @update:value="setValue(template.field, $event)"/>
                </template>
            </template>
            <template v-else-if="template.type === 'search'">
                <template v-if="value?.[template.field] !== undefined">
                    <AttachSearchBox :value="(value[template.field] as TemplateOption | TemplateOption[])" :template="template" @update:value="setValue(template.field, $event)"/>
                </template>
            </template>
        </template>
        <AttachFilterButton :templates="templates" :value="value" @set="setValue" @clear="clear"/>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
@import "../../../styles/base/color"

.root
    position: relative
    display: flex
    flex-wrap: nowrap
    align-items: center
    border-bottom: solid 1px $dark-mode-border-color
</style>
