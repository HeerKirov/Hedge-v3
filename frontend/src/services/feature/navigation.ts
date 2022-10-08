import { ref, Ref } from "vue"

/**
 * 提供一组detail view视图控制器。detail view视图通常用于页面上list视图的内嵌视图，在list视图中提供新建和详情页面功能。
 * 它也能兼任简单detail pane的一些功能。
 */
export interface DetailViewState<PATH, CT = undefined> {
    mode: Readonly<Ref<DetailViewMode<PATH, CT>>>
    createView(template?: CT): void
    detailView(path: PATH): void
    closeView(): void
}

type DetailViewMode<PATH, CT> = {
    type: "create"
    template: CT | null
} | {
    type: "detail"
    path: PATH
} | {
    type: "close"
}

export function useDetailViewState<PATH, CT = undefined>(): DetailViewState<PATH, CT> {
    const mode: Ref<DetailViewMode<PATH, CT>> = ref(CLOSE_VALUE)
    return {
        mode,
        createView(template?: CT) {
            mode.value = {type: "create", template: template ?? null}
        },
        detailView(path: PATH) {
            mode.value = {type: "detail", path}
        },
        closeView() {
            mode.value = CLOSE_VALUE
        }
    }
}

const CLOSE_VALUE = {type: "close"} as const
