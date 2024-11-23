import { reactive, ref, Ref, watch } from "vue"
import { installation, installationNullable } from "@/utils/reactivity"
import { useLocalStorage } from "@/functions/app"
import { MenuItem } from "@/modules/popup-menu"

export type MenuBadge = string | number | MenuBadgeDefinition | MenuBadgeDefinition[] | null | undefined

export interface MenuBadgeDefinition {
    count: number
    type: "std" | "danger"
}

export interface ContextMenuDefinition {
    (ctx: {id: string, label: string}): MenuItem<undefined>[] | null | undefined
}

export const [installMenuContext, useMenuContext] = installation(function (selected: Readonly<Ref<string | undefined>>, setSelected: (selected: string) => void, contextMenu: ContextMenuDefinition) {
    const scopeStorage = useLocalStorage<{[scopeKey: string]: boolean}>("side-bar/menu/scope", () => ({}), true)

    const scopeStatus = reactive(scopeStorage.value)

    watch(() => scopeStatus, scopeStatus => scopeStorage.value = scopeStatus, {deep: true})

    const itemStatus = reactive<{[itemKey: string]: boolean}>({})

    return {scopeStatus, itemStatus, selected, setSelected, commonContextMenu: contextMenu}
})

export const [installParentContext, useParentContext] = installationNullable(function () {
    return {subSelected: ref<string>(), count: ref<number>(0)}
})