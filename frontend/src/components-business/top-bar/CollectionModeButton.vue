<script setup lang="ts">
import { Button } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { IllustQueryType } from "@/functions/http-client/api/illust"
import { MenuItem } from "@/modules/popup-menu"

const props = defineProps<{
    value?: IllustQueryType | boolean
}>()

const emit = defineEmits<{
    (e: "update:value", v: IllustQueryType): void
}>()

const toggle = () => {
    emit("update:value", props.value === "IMAGE" ? "COLLECTION" : props.value === "COLLECTION" ? "IMAGE" : props.value === "ONLY_COLLECTION" ? "ONLY_IMAGE" : "ONLY_COLLECTION")
}

const menuItems = () => <MenuItem<undefined>[]>[
    {type: "radio", label: "图像视图", checked: props.value === "IMAGE", click: () => emit("update:value", "IMAGE")},
    {type: "radio", label: "集合视图", checked: props.value === "COLLECTION", click: () => emit("update:value", "COLLECTION")},
    {type: "radio", label: "仅所有集合", checked: props.value === "ONLY_COLLECTION", click: () => emit("update:value", "ONLY_COLLECTION")},
    {type: "radio", label: "仅无集合图像", checked: props.value === "ONLY_IMAGE", click: () => emit("update:value", "ONLY_IMAGE")},
]

</script>

<template>
    <ElementPopupMenu :items="menuItems" position="bottom" v-slot="{ setEl, popup }">
        <Button :ref="setEl" square :icon="value === 'COLLECTION' ? 'images' : value === 'IMAGE' ? 'image' : value === 'ONLY_COLLECTION' ? 'face-meh-blank' : 'face-meh-blank-regular'" @click="toggle" @contextmenu="popup"/>
    </ElementPopupMenu>
</template>
