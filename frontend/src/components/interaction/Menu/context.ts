import { reactive, Ref, watch } from "vue"
import { installation } from "@/utils/reactivity"
import { useLocalStorage } from "@/functions/app"

export const [installMenuContext, useMenuContext] = installation(function (selected: Ref<{ id: string, subId: string | null } | undefined>) {
    const scopeStorage = useLocalStorage<{[scopeKey: string]: boolean}>("side-bar/menu/scope", () => ({}), true)

    const scopeStatus = reactive(scopeStorage.value)

    watch(() => scopeStatus, scopeStatus => scopeStorage.value = scopeStatus, {deep: true})

    const itemStatus = reactive<{[itemKey: string]: boolean}>({})

    return {scopeStatus, itemStatus, selected}
})
