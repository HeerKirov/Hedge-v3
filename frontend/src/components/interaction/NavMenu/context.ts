import type { ContextMenuDefinition } from "@/components/interaction/SideMenu/context"
import { MenuItem } from "@/modules/popup-menu"
import { installation } from "@/utils/reactivity"

export type { ContextMenuDefinition }

export interface NavContextMenuDefinition {
    (ctx: {routeName: string, routePath?: unknown, label: string}): MenuItem<undefined>[] | null | undefined
}

export const [installNavMenuContext, useNavMenuContext] = installation(function () {
    const mapping: Record<string, {routeName: string, routePath?: unknown}> = {}

    return {mapping}
})