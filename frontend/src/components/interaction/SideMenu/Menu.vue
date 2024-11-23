<script setup lang="ts">
import { toRef } from "vue"
import { ContextMenuDefinition, installMenuContext } from "./context"

// == Menu 侧边栏主菜单 ==
// 侧边栏的、拥有二级菜单和折叠区块的纵向菜单。
// 通过在组件下添加Scope和MenuItem组件，即可添加折叠区块和菜单项。
// 通过selected参数即可管理选中项。选中二级菜单项时，所属的一级项也会有标示。

const props = defineProps<{
    selected?: string
    contextMenu?: ContextMenuDefinition
}>()

const emit = defineEmits<{
    (e: "update:selected", value: string): void
}>()

installMenuContext(toRef(props, "selected"), value => emit("update:selected", value), v => props.contextMenu?.(v))

</script>

<template>
    <slot/>
</template>
