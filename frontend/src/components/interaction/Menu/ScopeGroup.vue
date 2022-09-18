<script setup lang="ts">
import { computed } from "vue"
import { MenuItemDefinition } from "./definition"
import { useMenuContext } from "./context"
import MenuScope from "./MenuScope.vue"
import ItemGroup from "./ItemGroup.vue"

const props = defineProps<{
    id?: string
    label?: string
    items: MenuItemDefinition[]
}>()

const { scopeStatus } = useMenuContext()

const currentScopeOpened = computed({
    get: () => props.id ? scopeStatus[props.id] ?? true : true,
    set: value => {
        if(props.id) {
            scopeStatus[props.id] = value
        }
    }
})

</script>

<template>
    <MenuScope v-if="!!label" :label="label" @click="currentScopeOpened = !currentScopeOpened"/>
    <template v-if="currentScopeOpened">
        <ItemGroup v-for="item in items" :key="item.id" :id="item.id" :icon="item.icon" :label="item.label" :submenu="item.submenu"/>
    </template>
</template>
