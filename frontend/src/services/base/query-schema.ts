import { computed, ref, Ref, watch } from "vue"
import { Dialect, QueryRes } from "@/functions/http-client/api/util-query"
import { useFetchHelper } from "@/functions/fetch"
import { useRouteStorage } from "@/functions/app"
import { useToast } from "@/modules/toast"
import { useParam } from "@/modules/browser"

export interface QuerySchemaContext {
    /**
     * 用作查询框的输入。
     */
    queryInputText: Ref<string | undefined>
    /**
     * 最终输出的query结果。将它用于最终查询参数。
     */
    query: Ref<string | undefined>
    /**
     * 解析完成的Query Schema。
     */
    schema: Ref<QueryRes | null>
    /**
     * 解析的状态，包括正在解析的状态和解析的耗时。
     */
    status: Ref<{loading: boolean, timeCost: number | null}>
}

export function useQuerySchema(dialect: Dialect): QuerySchemaContext {
    const toast = useToast()
    const fetch = useFetchHelper(client => client.queryUtil.querySchema)

    const query = useParam<string | undefined>("query", () => undefined, true)
    const schema = useRouteStorage<QueryRes>(`query-schema/${dialect}/schema`)
    const status = ref<{loading: boolean, timeCost: number | null}>({loading: false, timeCost: null})

    watch(query, async query => {
        if(query === undefined) {
            schema.value = null
            status.value = {loading: false, timeCost: null}
        }else{
            status.value = {loading: true, timeCost: null}
            const t1 = Date.now()
            const res = await fetch({dialect, text: query}, toast.handleException)
            if(res !== undefined) {
                schema.value = res
            }
            status.value = {loading: false, timeCost: Date.now() - t1}
        }
    }, {immediate: true})

    const queryInputText = computed({
        get: () => query.value,
        set: queryInputText => {
            const text = queryInputText?.trim()
            if(!text) {
                if(query.value !== undefined) {
                    query.value = undefined
                }
            }else if(text !== query.value) {
                query.value = text
            }
        }
    })

    return {queryInputText, query, schema, status}
}
