<script setup lang="ts">
import { computed } from "vue"
import { ElementPopupMenu } from "@/components/interaction"
import { DisplayStyle, ModeInButtons, TemplateOption } from "./template"
import AttachBaseButton from "./AttachBaseButton.vue"

defineOptions({
    inheritAttrs: false
})

const props = defineProps<{
    value?: any
    options: TemplateOption[]
    modeInButtons?: ModeInButtons
    displayStyle?: DisplayStyle
}>()

const emit = defineEmits<{
    (e: "update:value", v: any | undefined): void
}>()

const popupMenuItems = () => props.options.map(item => ({
    type: "radio",
    label: item.label,
    checked: item.value === props.value,
    click: item.value === props.value ? () => emit("update:value", undefined) : () => emit("update:value", item.value)
} as const))

const labelItems = computed(() => props.value !== undefined ? [props.options.find(i => i.value === props.value)!] : [])

</script>

<template>
    <ElementPopupMenu :items="popupMenuItems" position="bottom" align="left" v-slot="{ setEl, popup }">
        <AttachBaseButton
            v-bind="$attrs"
            :ref="setEl"
            :items="labelItems"
            :mode-in-buttons="modeInButtons ?? 'icon-and-label'"
            :display-style="displayStyle"
            @click="popup" @contextmenu="popup"
        />
    </ElementPopupMenu>
</template>
