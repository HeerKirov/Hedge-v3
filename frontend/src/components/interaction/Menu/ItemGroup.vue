<script setup lang="ts">
import { computed } from "vue"
import { SubMenuItemDefinition } from "./definition"
import { useMenuContext } from "./context"
import MenuItem from "./MenuItem.vue"
import MenuSubItem from "./MenuSubItem.vue"

const props = defineProps<{
    id: string
    icon: string
    label: string
    submenu?: SubMenuItemDefinition[]
}>()

const { itemStatus, selected } = useMenuContext()

const hasSub = computed(() => props.submenu && props.submenu.length > 0)

const currentSubOpened = computed({
    get: () => itemStatus[props.id] ?? true,
    set: value => {
        if(props.id) {
            itemStatus[props.id] = value
        }
    }
})

const menuItemChecked = computed(() => selected.value !== undefined && selected.value.id === props.id ? (selected.value.subId !== null ? "sub-selected" : "selected") : null)

const subMenuItemChecked = computed(() => selected.value !== undefined && selected.value.id === props.id ? selected.value.subId : null)

const clickMenuItem = () => {
    if(selected.value === undefined || selected.value.id !== props.id || selected.value.subId !== null) {
        selected.value = {id: props.id, subId: null}
    }
}

const clickSubMenuItem = (subId: string) => {
    if(selected.value === undefined || selected.value.id !== props.id || selected.value.subId !== subId) {
        selected.value = {id: props.id, subId}
    }
}

</script>

<template>
    <MenuItem :label="label" :icon="icon" :checked="menuItemChecked" :has-sub="hasSub" v-model:sub-open="currentSubOpened" @click="clickMenuItem"/>
    <template v-if="currentSubOpened">
        <MenuSubItem v-for="sub in submenu" :key="sub.id" :label="sub.label" :checked="subMenuItemChecked === sub.id" @click="clickSubMenuItem(sub.id)"/>
    </template>
</template>

<style module lang="sass">

</style>
