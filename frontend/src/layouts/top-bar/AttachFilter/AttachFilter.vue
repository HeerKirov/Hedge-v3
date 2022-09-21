<script setup lang="ts">
import { Button } from "@/components/universal"
import { PopupMenu } from "@/components/logical"
import { AttachTemplate } from "./template"
import { createMenuTemplate } from "./menu"

const props = defineProps<{
    templates?: AttachTemplate[]
    value?: {[field: string]: any}
}>()

const emit = defineEmits<{
    (e: "update:value", value: {[field: string]: any}): void
    (e: "clear"): void
}>()

const setValue = (field: string, value: any) => emit("update:value", {...props.value, [field]: value})

const clear = () => emit("clear")

const popupMenuItems = () => createMenuTemplate(props.templates ?? [], props.value ?? {}, setValue, clear)

</script>

<template>
    <div :class="$style.root">
        <PopupMenu :items="popupMenuItems" position="bottom" align="left" v-slot="{ setEl, popup }">
            <Button :ref="setEl" icon="filter" square expose-el @click="popup"/>
        </PopupMenu>
    </div>
</template>

<style module lang="sass">
.root
    position: relative
    display: flex
    flex-wrap: nowrap
    align-items: center
</style>
