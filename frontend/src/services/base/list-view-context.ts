import { Ref } from "vue"
import { PaginationDataView, PaginationViewState, QueryListview, usePaginationDataView, useQueryListview } from "@/functions/fetch"
import { QueryListviewOptions } from "@/functions/fetch/query-listview/query-listview"
import { useRouteStorage } from "@/functions/app"
import { BasicException } from "@/functions/http-client/exceptions"
import { useInterceptedKey } from "@/modules/keyboard"

/**
 * 使用ListView的列表相关上下文。提供：ListView、PaginationDataView、Filter。如果有需要，还包括Selector、QuerySchema。
 * 同时，它还注册了CTRL+R快捷键，用于刷新列表。
 */
interface ListViewContext<T, KEY, F> {
    listview: QueryListview<T, KEY>
    paginationData: PaginationDataView<T>
    queryFilter: Ref<F>
}

interface ListViewContextOptions<T, KEY, F> {
    request: QueryListviewOptions<T, KEY, F, BasicException>["request"]
    eventFilter?: QueryListviewOptions<T, KEY, F, BasicException>["eventFilter"]
    keyOf: QueryListviewOptions<T, KEY, F, BasicException>["keyOf"]
    defaultFilter?: F
    filter?: Ref<F>
}

export function useListViewContext<T, KEY, F>(options: ListViewContextOptions<T, KEY, F>): ListViewContext<T, KEY, F> {
    const storage = useRouteStorage<PaginationViewState>("list-view/pagination-data")

    const queryFilter: Ref<F> = options.filter ?? useRouteStorage("list-view/query-filter", () => options.defaultFilter, true) as Ref<F>

    const listview = useQueryListview({
        filter: queryFilter,
        keyOf: options.keyOf,
        request: options.request,
        eventFilter: options.eventFilter
    })

    const paginationData = usePaginationDataView({listview, storage, bufferPercent: 0.2})
    
    useInterceptedKey("Meta+KeyR", listview.refresh)

    return {
        listview,
        queryFilter,
        paginationData
    }
}
