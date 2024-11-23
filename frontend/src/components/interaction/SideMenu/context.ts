import { reactive, ref, Ref, watch } from "vue"
import { installation, installationNullable } from "@/utils/reactivity"
import { useLocalStorage } from "@/functions/app"

export type MenuBadge = string | number | MenuBadgeDefinition | MenuBadgeDefinition[] | null | undefined

export interface MenuBadgeDefinition {
    count: number
    type: "std" | "danger"
}

export const [installMenuContext, useMenuContext] = installation(function (selected: Readonly<Ref<string | undefined>>, setSelected: (selected: string) => void) {
    const scopeStorage = useLocalStorage<{[scopeKey: string]: boolean}>("side-bar/menu/scope", () => ({}), true)

    const scopeStatus = reactive(scopeStorage.value)

    watch(() => scopeStatus, scopeStatus => scopeStorage.value = scopeStatus, {deep: true})

    const itemStatus = reactive<{[itemKey: string]: boolean}>({})

    return {scopeStatus, itemStatus, selected, setSelected}
})

export const [installParentContext, useParentContext] = installationNullable(function () {
    return {subSelected: ref<string>(), count: ref<number>(0)}
})