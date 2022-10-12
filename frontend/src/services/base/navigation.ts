import { computed, ref, Ref } from "vue"

/**
 * 提供一组detail view视图控制器。detail view视图通常用于页面上list视图的内嵌视图，在list视图中提供新建和详情页面功能。
 * 它也能兼任简单detail pane的一些功能。
 */
export interface DetailViewState<PATH, CT = undefined> {
    mode: Readonly<Ref<DetailViewMode<PATH, CT>>>
    detailPath: Readonly<Ref<PATH | null>>
    createView(template?: CT): void
    detailView(path: PATH): void
    closeView(): void
    isOpen(): boolean
    isDetailView(path?: PATH): boolean
    isCreateView(): boolean
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

    const detailPath = computed<PATH | null>(() => mode.value.type === "detail" ? mode.value.path : null)

    return {
        mode,
        detailPath,
        createView(template?: CT) {
            mode.value = {type: "create", template: template ?? null}
        },
        detailView(path: PATH) {
            mode.value = {type: "detail", path}
        },
        closeView() {
            mode.value = CLOSE_VALUE
        },
        isOpen(): boolean {
            return mode.value.type !== "close"
        },
        isCreateView(): boolean {
            return mode.value.type === "create"
        },
        isDetailView(path?: PATH): boolean {
            return mode.value.type === "detail" && (path === undefined || mode.value.path === path)
        }
    }
}

const CLOSE_VALUE = {type: "close"} as const
