<script setup lang="ts">
import { computed } from "vue"
import { MenuDefinition, MenuItemDefinition } from "./definition"
import { installMenuContext } from "./context"
import ScopeGroup from "./ScopeGroup.vue"

// == Menu 侧边栏主菜单 ==
// 侧边栏的、拥有二级菜单和折叠区块的纵向菜单。通过items参数即可传入菜单项或区块配置。每个区块配置都管辖它下面的菜单项。
// 通过selected参数即可管理选中项。选中相关参数分为id和subId，分别代表选中的一级菜单项和二级菜单项，选中二级菜单项时，所属的一级项也会有标示。

const props = defineProps<{
    items?: MenuDefinition[]
    selected?: {id: string, subId: string | null}
}>()

const emit = defineEmits<{
    (e: "update:selected", value: {id: string, subId: string | null} | undefined): void
}>()

installMenuContext(computed({
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
