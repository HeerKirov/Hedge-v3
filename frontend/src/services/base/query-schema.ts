import { ref, Ref, watch } from "vue"
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

    const queryInputText = ref<string | undefined>(query.value)

    watch(query, query => { if(query !== queryInputText.value) queryInputText.value = query })

    watch(queryInputText, async queryInputText => {
        const text = queryInputText?.trim()
        if(!text) {
            if(query.value !== undefined) {
                query.value = undefined
                schema.value = null
                status.value = {loading: false, timeCost: null}
            }
        }else if(text !== query.value) {
            status.value = {loading: true, timeCost: null}
            const t1 = Date.now()
            const res = await fetch({dialect, text}, toast.handleException)
            if(res !== undefined) {
                schema.value = res
                query.value = text
            }
            status.value = {loading: false, timeCost: Date.now() - t1}
        }
    })

    return {queryInputText, query, schema, status}
}
