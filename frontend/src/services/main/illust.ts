import { Ref, watch } from "vue"
import { installVirtualViewNavigation } from "@/components/data"
import { flatResponse } from "@/functions/http-client"
import { IllustQueryFilter, IllustType } from "@/functions/http-client/api/illust"
import { useLocalStorage } from "@/functions/app"
import { useRouterParamEvent } from "@/modules/router"
import { useListViewContext } from "@/services/base/list-view-context"
import { useSelectedState } from "@/services/base/selected-state"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { useQuerySchema } from "@/services/base/query-schema"
import { useSettingSite } from "@/services/setting"
import { installation, toRef } from "@/utils/reactivity"

export const [installIllustContext, useIllustContext] = installation(function () {
    const listview = useListView()
    const selector = useSelectedState({queryListview: listview.listview, keyOf: item => item.id})
    const paneState = useSelectedPaneState("illust", selector)
    const query = toRef(listview.queryFilter, "query")
    const querySchema = useQuerySchema("ILLUST", query)
    const listviewController = useListViewController(toRef(listview.queryFilter, "type"))
    const operators = {}

    installVirtualViewNavigation()
    useSettingSite()

    useRouterParamEvent("MainIllust", params => {
        //监听router event。只监听Illust的，Partition没有。
        //对于meta tag，将其简单地转换为DSL的一部分。
        //FUTURE 当然这其实是有问题的，对于topic/tag，还应该使用地址去限制它们。
        querySchema.queryInputText.value = [
            params.tagName ? `$\`${params.tagName}\`` : undefined,
            params.topicName ? `#\`${params.topicName}\`` : undefined,
            params.authorName ? `@\`${params.authorName}\`` : undefined,
            params.source ? `^SITE:${params.source.site} ^ID:${params.source.id}` : undefined
        ].filter(i => i !== undefined).join(" ")
    })

    return {paneState, listview, selector, listviewController, querySchema, operators}
})

function useListView() {
    return useListViewContext({
        defaultFilter: <IllustQueryFilter>{order: "-orderTime", type: "IMAGE"},
        request: client => (offset, limit, filter) => client.illust.list({offset, limit, ...filter}),
        eventFilter: {
            filter: ["entity/illust/created", "entity/illust/updated", "entity/illust/deleted"],
            operation({ event, refresh, update, remove }) {
                if(event.eventType === "entity/illust/created") {
                    refresh()
                }else if(event.eventType === "entity/illust/updated") {
                    update(i => i.id === event.illustId)
                }else if(event.eventType === "entity/illust/deleted") {
                    remove(i => i.id === event.illustId)
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.illust.get(a.id))))
        }
    })
}

function useListViewController(queryFilterIllustType: Ref<IllustType>) {
    const storage = useLocalStorage<{
        fitType: "cover" | "contain", columnNum: number, collectionMode: boolean, viewMode: "row" | "grid"
    }>("illust/list/view-controller", {
        fitType: "cover", columnNum: 8, collectionMode: false, viewMode: "grid"
    })

    watch(() => storage.value.collectionMode, collectionMode => queryFilterIllustType.value = collectionMode ? "COLLECTION" : "IMAGE", {immediate: true})

    return {
        fitType: toRef(storage, "fitType"),
        columnNum: toRef(storage, "columnNum"),
        collectionMode: toRef(storage, "collectionMode"),
        viewMode: toRef(storage, "viewMode")
    }
}
