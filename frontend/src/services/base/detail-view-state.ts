import { computed, ref, Ref } from "vue"

/**
 * 提供一组detail view视图控制器。detail view视图通常用于页面上list视图的内嵌视图，在list视图中提供新建和详情页面功能。
 * 它也能兼任简单detail pane的一些功能。
 */
export interface DetailViewState<PATH, CT = undefined> {
    /**
     * 显示当前视图模式。
     */
    mode: Readonly<Ref<DetailViewMode<PATH, CT>["type"]>>
    /**
     * 视图是否处于开启状态。
     */
    opened: Readonly<Ref<boolean>>
    /**
     * 在detail视图模式下，显示path。不处于detail模式时值为null。
     */
    detailPath: Readonly<Ref<PATH | null>>
    /**
     * 在create视图模式下，显示template。不处于create模式时值为null。
     */
    createTemplate: Readonly<Ref<CT | null>>
    /**
     * 切换create视图。
     */
    openCreateView(template?: CT): void
    /**
     * 切换detail视图。
     */
    openDetailView(path: PATH): void
    /**
     * 关闭视图。
     */
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
    const state: Ref<DetailViewMode<PATH, CT>> = ref(CLOSE_VALUE)

    const mode = computed(() => state.value.type)

    const opened = computed(() => state.value.type !== "close")

    const detailPath = computed<PATH | null>(() => state.value.type === "detail" ? state.value.path : null)

    const createTemplate = computed<CT | null>(() => state.value.type === "create" ? state.value.template : null)

    return {
        mode,
        opened,
        detailPath,
        createTemplate,
        openCreateView(template?: CT) {
            state.value = {type: "create", template: template ?? null}
        },
        openDetailView(path: PATH) {
            state.value = {type: "detail", path}
        },
        closeView() {
            state.value = CLOSE_VALUE
        }
    }
}

const CLOSE_VALUE = {type: "close"} as const
