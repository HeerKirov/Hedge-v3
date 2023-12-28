import { ref, Ref, watch } from "vue"
import { Dialect, QueryRes } from "@/functions/http-client/api/util-query"
import { useFetchHelper } from "@/functions/fetch"
import { useTabStorage } from "@/functions/app"
import { useToast } from "@/modules/toast"

export interface QuerySchemaContext {
    /**
     * 用作查询框的输入。
     */
    queryInputText: Ref<string | undefined>
    /**
     * 扩展区域的开关。
     */
    expanded: Ref<boolean>
    /**
     * 最终输出的query结果。将它用于最终查询参数。
     */
    query: Ref<string | undefined>
    /**
     * 解析完成的Query Schema。
     */
    schema: Ref<QueryRes | null>
}

export function useQuerySchema(dialect: Dialect): QuerySchemaContext {
    const toast = useToast()
    const fetch = useFetchHelper(client => client.queryUtil.querySchema)

    const query = useTabStorage<string | undefined>(`query-schema/${dialect}/query`, undefined)
    const schema = useTabStorage<QueryRes>(`query-schema/${dialect}/schema`)

    const queryInputText = ref<string | undefined>(query.value)
    const expanded = ref<boolean>(false)

    watch(queryInputText, async queryInputText => {
        const text = queryInputText?.trim()
        if(!text) {
            expanded.value = false
            query.value = undefined
            schema.value = null
        }else{
            const res = await fetch({dialect, text}, toast.handleException)
            if(res !== undefined) {
                schema.value = res
                query.value = text
                expanded.value = expanded.value || !!res.errors.length
            }
        }
    })

    return {queryInputText, expanded, query, schema}
}
