import { installation } from "@/utils/reactivity"

export const [installNavMenuContext, useNavMenuContext] = installation(function () {
    const mapping: Record<string, {routeName: string, routePath?: unknown}> = {}

    return {mapping}
})