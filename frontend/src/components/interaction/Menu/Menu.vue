<script setup lang="ts">
import { computed } from "vue"
import { MenuDefinition, MenuItemDefinition } from "./definition"
import { installMenuContext } from "./context"
import ScopeGroup from "./ScopeGroup.vue"

const props = defineProps<{
    items?: MenuDefinition[]
    selected?: {id: string, subId: string | null}
}>()

const emit = defineEmits<{
    (e: "update:selected", value: {id: string, subId: string | null} | undefined): void
}>()

const { selected } = installMenuContext(computed({
    get: () => props.selected,
    set: value => emit("update:selected", value)
}))

const scopes = computed(() => {
    //此处的逻辑将平铺的scope与menu整理为组件可用的树结构。
    const items = props.items ?? []
    const scopes = []

    let currentScope: {id: string | undefined, label: string | undefined, items: MenuItemDefinition[]} = {id: undefined, label: undefined, items: []}
    for(const item of items) {
        if(item.type === "scope") {
            if(currentScope.items.length > 0) {
                scopes.push(currentScope)
            }
            currentScope = {id: item.id, label: item.label, items: []}
        }else{
            currentScope.items.push(item)
        }
    }
    if(currentScope.items.length > 0) {
        scopes.push(currentScope)
    }

    return scopes
})

</script>

<template>
    <ScopeGroup v-for="scope in scopes" :key="scope.id" v-bind="scope"/>
</template>
