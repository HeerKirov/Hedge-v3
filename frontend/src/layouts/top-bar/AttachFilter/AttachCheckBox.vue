<script setup lang="ts">
import { PopupMenu } from "@/components/interaction"
import { DisplayStyle, ModeInButtons } from "./template"
import AttachBaseButton from "./AttachBaseButton.vue"

const props = defineProps<{
    label: string
    icon?: string
    color?: string
    modeInButtons?: ModeInButtons
    displayStyle?: DisplayStyle
}>()

const emit = defineEmits<{
    (e: "cancel"): void
}>()

const popupMenuItems = () => [{type: "checkbox", label: props.label, checked: true, click: () => emit("cancel")} as const]

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
            :items="[{label, icon, color}]"
            :mode-in-buttons="modeInButtons ?? 'icon-only'"
            :display-style="displayStyle"
            @click="popup" @contextmenu="popup"
        />
    </PopupMenu>
</template>
