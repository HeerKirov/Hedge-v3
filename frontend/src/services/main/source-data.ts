import { installVirtualViewNavigation } from "@/components/data"
import { useFetchEndpoint, useRetrieveHelper } from "@/functions/fetch"
import { flatResponse, mapResponse } from "@/functions/http-client"
import { SourceDataIdentity, SourceDataQueryFilter, SourceEditStatus } from "@/functions/http-client/api/source-data"
import { DetailViewState, useDetailViewState } from "@/services/base/detail-view-state"
import { useListViewContext } from "@/services/base/list-view-context"
import { useSettingSite } from "@/services/setting"
import { useMessageBox } from "@/modules/message-box"
import { useRouterNavigator } from "@/modules/router"
import { installation } from "@/utils/reactivity"

export const [installSourceDataContext, useSourceDataContext] = installation(function () {
    const paneState = useDetailViewState<SourceDataIdentity>()

    const listview = useListView()

    const operators = useOperators(paneState)

    installVirtualViewNavigation()
    useSettingSite()

    return {listview, operators, paneState}
})

function useListView() {
    return useListViewContext({
        defaultFilter: <SourceDataQueryFilter>{order: "-updateTime"},
        request: client => (offset, limit, filter) => client.sourceData.list({offset, limit, ...filter}),
        eventFilter: {
            filter: ["entity/source-data/created", "entity/source-data/updated", "entity/source-data/deleted"],
            operation({ event, refresh, update, remove }) {
                if(event.eventType === "entity/source-data/created") {
                    refresh()
                }else if(event.eventType === "entity/source-data/updated") {
                    update(i => i.sourceSite === event.site && i.sourceId === event.sourceId)
                }else if(event.eventType === "entity/source-data/deleted") {
                    remove(i => i.sourceSite === event.site && i.sourceId === event.sourceId)
                }
            },
            request: client => async items => {
                const res = flatResponse(await Promise.all(items.map(a => client.sourceData.get({sourceSite: a.sourceSite, sourceId: a.sourceId}))))
                return mapResponse(res, items => items.map(item => {
                    if(item) {
                        const { books, relations, tags, ...leave } = item
                        return {...leave, bookCount: books.length, tagCount: tags.length, relationCount: relations.length}
                    }else{
                        return undefined
                    }
                }))
            }
        }
    })
}

function useOperators(paneState: DetailViewState<SourceDataIdentity>) {
    const message = useMessageBox()

    const retrieveHelper = useRetrieveHelper({
        delete: client => client.sourceData.delete
    })

    const deleteItem = async (id: SourceDataIdentity) => {
        if(await message.showYesNoMessage("warn", "确定要删除此项吗？", "此操作不可撤回。")) {
            if(await retrieveHelper.deleteData(id)) {
                if(paneState.detailPath.value === id) paneState.closeView()
            }
        }
    }

    return {deleteItem}
}

export function useSourceDataDetailPane() {
    const navigator = useRouterNavigator()
    const { paneState } = useSourceDataContext()

    const { data, setData } = useFetchEndpoint({
        path: paneState.detailPath,
        get: client => client.sourceData.get,
        update: client => client.sourceData.update,
        delete: client => client.sourceData.delete,
        eventFilter: c => event => (event.eventType === "entity/source-data/updated" || event.eventType === "entity/source-data/deleted") && c.path !== null && event.site === c.path.sourceSite && event.sourceId === c.path.sourceId,
        afterRetrieve(path, data) {
            if(path !== null && data === null) {
                paneState.closeView()
            }
        }
    })

    const { data: relatedImages } = useFetchEndpoint({
        path: paneState.detailPath,
        get: client => client.sourceData.getRelatedImages,
        eventFilter: c => event => (event.eventType === "entity/source-data/updated" || event.eventType === "entity/source-data/deleted") && c.path !== null && event.site === c.path.sourceSite && event.sourceId === c.path.sourceId,
    })

    const gotoIllust = () => {
        if(data.value !== null) {
            navigator.goto({routeName: "MainIllusts", params: {source: {site: data.value.sourceSite, id: data.value.sourceId}}})
        }
    }

    const setSourceEditStatus = async (status: SourceEditStatus) => {
        return (status === data.value?.status) || await setData({status})
    }

    return {data, relatedImages, setSourceEditStatus, gotoIllust}
}
