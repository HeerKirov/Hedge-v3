<script setup lang="ts">
import { PopupMenu } from "@/components/interaction"
import { DisplayStyle, ModeInButtons, TemplateOption } from "./template"
import AttachBaseButton from "./AttachBaseButton.vue"
import { computed } from "vue";

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

<script lang="ts">
export default {
    inheritAttrs: false
}
</script>

<template>
    <PopupMenu :items="popupMenuItems" position="bottom" align="left" v-slot="{ setEl, popup }">
        <AttachBaseButton
            v-bind="$attrs"
            :ref="setEl"
            :items="labelItems"
            :mode-in-buttons="modeInButtons ?? 'icon-and-label'"
            :display-style="displayStyle"
            @click="popup" @contextmenu="popup"
        />
    </PopupMenu>
</template>
