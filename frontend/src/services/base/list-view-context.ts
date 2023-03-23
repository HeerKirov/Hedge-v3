import { ref, Ref } from "vue"
import { PaginationDataView, QueryListview, usePaginationDataView, useQueryListview } from "@/functions/fetch"
import { QueryListviewOptions } from "@/functions/fetch/query-listview/query-listview"
import { BasicException } from "@/functions/http-client/exceptions"

/**
 * 使用ListView的列表相关上下文。提供：ListView、PaginationDataView、Filter。如果有需要，还包括Selector、QuerySchema。
 */
interface ListViewContext<T, F> {
    listview: QueryListview<T>
    paginationData: PaginationDataView<T>
    queryFilter: Ref<F>
}

interface ListViewContextOptions<T, F> {
    request: QueryListviewOptions<T, F, BasicException>["request"]
    eventFilter?: QueryListviewOptions<T, F, BasicException>["eventFilter"]
    defaultFilter?: F
    filter?: Ref<F>
}

export function useListViewContext<T, F>(options: ListViewContextOptions<T, F>): ListViewContext<T, F> {
    const queryFilter: Ref<F> = options.filter ?? ref(options.defaultFilter ?? {}) as Ref<F>

    const listview = useQueryListview({
        filter: queryFilter,
        request: options.request,
        eventFilter: options.eventFilter
    })

    const paginationData = usePaginationDataView(listview)

    return {
        listview,
        queryFilter,
        paginationData
    }
}
