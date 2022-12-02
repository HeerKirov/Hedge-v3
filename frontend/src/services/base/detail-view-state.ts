import { computed, ref, Ref } from "vue"

/**
 * 提供一组detail view视图控制器。detail view视图通常用于页面上list视图的内嵌视图，在list视图中提供新建和详情页面功能。
 * 它也能兼任简单detail pane的一些功能。
 */
export interface DetailViewState<PATH, CT = undefined> {
    /**
     * 显示当前视图模式，以及视图模式的附加信息。
     */
    mode: Readonly<Ref<DetailViewMode<PATH, CT>>>
    /**
     * 在detail视图模式下，显示path。不处于detail模式时值为null。
     */
    detailPath: Readonly<Ref<PATH | null>>
    /**
     * 在create视图模式下，显示template。不处于create模式时值为null。
     */
    createTemplate: Readonly<Ref<CT | null>>
    /**
     * 切换至create视图。
     * @param template
     */
    createView(template?: CT): void
    /**
     * 切换至detail视图。
     * @param path
     */
    detailView(path: PATH): void
    /**
     * 关闭视图。
     */
    closeView(): void
    /**
     * 判断视图是否是开启状态。内含响应式调用。
     */
    isOpen(): boolean
    /**
     * 判断视图是否是detail状态。内含响应式调用。
     * @param path 判断path是否是指定path
     */
    isDetailView(path?: PATH): boolean
    /**
     * 判断视图是否是create状态。内含响应式调用。
     */
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

    const createTemplate = computed<CT | null>(() => mode.value.type === "create" ? mode.value.template : null)

    return {
        mode,
        detailPath,
        createTemplate,
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
