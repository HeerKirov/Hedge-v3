<script setup lang="ts">
import { ElementPopupMenu } from "@/components/interaction"
import { Colors } from "@/constants/ui"
import { DisplayStyle, ModeInButtons } from "./template"
import AttachBaseButton from "./AttachBaseButton.vue"

defineOptions({
    inheritAttrs: false
})

const props = defineProps<{
    label: string
    icon?: string
    color?: Colors
    modeInButtons?: ModeInButtons
    displayStyle?: DisplayStyle
}>()

const emit = defineEmits<{
    (e: "cancel"): void
}>()

const popupMenuItems = () => [{type: "checkbox", label: props.label, checked: true, click: () => emit("cancel")} as const]

</script>

<template>
    <ElementPopupMenu :items="popupMenuItems" position="bottom" align="left" v-slot="{ setEl, popup }">
        <AttachBaseButton
            v-bind="$attrs"
            :ref="setEl"
            :items="[{label, icon, color}]"
            :mode-in-buttons="modeInButtons ?? 'icon-only'"
            :display-style="displayStyle"
            @click="popup" @contextmenu="popup"
        />
    </ElementPopupMenu>
</template>
