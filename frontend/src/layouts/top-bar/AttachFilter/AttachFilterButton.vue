<script setup lang="ts">
import { ref, computed } from "vue"
import { Button } from "@/components/universal"
import { PopupMenu, PopupCallout } from "@/components/interaction"
import { AttachTemplate, SearchTemplate } from "./template"
import { createMenuTemplate } from "./menu"
import { parseOrder } from "./utils"
import AttachSearchPicker from "./AttachSearchPicker.vue"

const props = defineProps<{
    templates?: AttachTemplate[]
    value?: {[field: string]: any}
}>()

const emit = defineEmits<{
    (e: "set", field: string, value: any): void
    (e: "clear"): void
}>()

const setValue = (field: string, value: any) => emit("set", field, value)

const clear = () => emit("clear")

const popupMenuItems = () => createMenuTemplate(props.templates ?? [], props.value ?? {}, setValue, activePicker, clear)

const anyActive = computed(() => {
    if(props.templates && props.value) {
        for (const template of props.templates) {
            if(template.type === "order") {
                if(props.value["order"]) {
                    const [v, d] = parseOrder(props.value["order"])
                    if(v !== template.defaultValue || d !== template.defaultDirection) return true
                }
            }else if(template.type === "checkbox") {
                if(props.value[template.field]) return true
            }else if(template.type !== "separator") {
                if(props.value[template.field] != undefined) return true
            }
        }
    }
    return false
})

const anySearchFilter = props.templates?.some(t => t.type === "search")

const activePicker = (template: SearchTemplate) => activeSearchPicker.value = {template}

const activeSearchPicker = ref<{template: SearchTemplate}>()

</script>

<template>
    <PopupCallout v-if="anySearchFilter" :class="$style.root" :visible="activeSearchPicker !== undefined" @close="activeSearchPicker = undefined">
        <PopupMenu :items="popupMenuItems" position="bottom" align="left" v-slot="{ setEl, popup }">
            <Button :ref="setEl" :class="$style.button" :type="anyActive ? 'primary' : undefined" @click="popup" @contextmenu="popup" icon="filter" square expose-el/>
        </PopupMenu>
        <template #popup>
            <AttachSearchPicker :template="activeSearchPicker!.template" :value="value?.[activeSearchPicker!.template.field]" @update:value="setValue(activeSearchPicker.template.field, $event)"/>
        </template>
    </PopupCallout>
    <template v-else>
        <PopupMenu :items="popupMenuItems" position="bottom" align="left" v-slot="{ setEl, popup }">
            <Button :ref="setEl" :class="$style.button" :type="anyActive ? 'primary' : undefined" @click="popup" @contextmenu="popup" icon="filter" square expose-el/>
        </PopupMenu>
    </template>
</template>

<style module lang="sass">
//因被popupCallout包裹，需要单独处理按钮的边角
.root:not(:first-child) .button,
.button:not(:first-child)
    border-top-left-radius: 0
    border-bottom-left-radius: 0
</style>
