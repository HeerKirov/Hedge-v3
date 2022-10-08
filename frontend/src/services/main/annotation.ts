import { installation } from "@/utils/reactivity"
import { installVirtualViewNavigation } from "@/components/data"
import { flatResponse } from "@/functions/http-client"
import { Annotation, AnnotationQueryFilter } from "@/functions/http-client/api/annotations"
import { useListViewContext } from "@/services/feature/list-context"
import { useDetailViewState } from "@/services/feature/navigation"

export const [installAnnotationContext, useAnnotationContext] = installation(function () {
    const list = useListViewContext({
        defaultFilter: <AnnotationQueryFilter>{type: "TOPIC", order: "-createTime"},
        request: client => (offset, limit, filter) => client.annotation.list({offset, limit, ...filter}),
        eventFilter: {
            filter: ["entity/annotation/created", "entity/annotation/updated", "entity/annotation/deleted"],
            operation({ event, refresh, update, remove }) {
                if(event.eventType === "entity/annotation/created" && event.metaType === list.queryFilter.value.type) {
                    refresh()
                }else if(event.eventType === "entity/annotation/updated" && event.metaType === list.queryFilter.value.type) {
                    update(i => i.id === event.annotationId)
                }else if(event.eventType === "entity/annotation/deleted" && event.metaType === list.queryFilter.value.type) {
                    remove(i => i.id === event.annotationId)
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.annotation.get(a.id))))
        }
    })
    const paneState = useDetailViewState<number, Partial<Annotation>>()

    installVirtualViewNavigation()

    return {list, paneState}
})
