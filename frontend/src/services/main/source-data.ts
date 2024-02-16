import { computed, watch } from "vue"
import { useFetchEndpoint, useRetrieveHelper } from "@/functions/fetch"
import { flatResponse, mapResponse } from "@/functions/http-client"
import { SourceDataIdentity, SourceDataQueryFilter, SourceEditStatus } from "@/functions/http-client/api/source-data"
import { DetailViewState, useRouteStorageViewState } from "@/services/base/detail-view-state"
import { useDialogService } from "@/components-module/dialog"
import { useListViewContext } from "@/services/base/list-view-context"
import { QuerySchemaContext, useQuerySchema } from "@/services/base/query-schema"
import { useSettingSite } from "@/services/setting"
import { useBrowserTabs, useTabRoute } from "@/modules/browser"
import { useMessageBox } from "@/modules/message-box"
import { installation } from "@/utils/reactivity"

export const [installSourceDataContext, useSourceDataContext] = installation(function () {
    const paneState = useRouteStorageViewState<SourceDataIdentity>()
    const querySchema = useQuerySchema("SOURCE_DATA")
    const listview = useListView(querySchema)
    const operators = useOperators(paneState)

    useSettingSite()

    return {listview, operators, paneState, querySchema}
})

function useListView(querySchema: QuerySchemaContext) {
    const listview = useListViewContext({
        defaultFilter: <SourceDataQueryFilter>{order: "-updateTime"},
        request: client => (offset, limit, filter) => client.sourceData.list({offset, limit, ...filter}),
        keyOf: item => `${item.sourceSite}-${item.sourceId}` as const,
        eventFilter: {
            filter: ["entity/source-data/created", "entity/source-data/updated", "entity/source-data/deleted"],
            operation({ event, refresh, updateKey, removeKey }) {
                if(event.eventType === "entity/source-data/created") {
                    refresh()
                }else if(event.eventType === "entity/source-data/updated") {
                    updateKey(`${event.site}-${event.sourceId}`)
                }else if(event.eventType === "entity/source-data/deleted") {
                    removeKey(`${event.site}-${event.sourceId}`)
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

    const status = computed(() => ({
        loading: listview.paginationData.status.value.loading || querySchema.status.value.loading,
        timeCost: (listview.paginationData.status.value.timeCost ?? 0) + (querySchema.status.value.timeCost ?? 0)
    }))

    watch(querySchema.query, query => listview.queryFilter.value.query = query, {immediate: true})

    return {...listview, status}
}

function useOperators(paneState: DetailViewState<SourceDataIdentity>) {
    const message = useMessageBox()

    const retrieveHelper = useRetrieveHelper({
        delete: client => client.sourceData.delete
    })

    const deleteItem = async (id: SourceDataIdentity) => {
        if(await message.showYesNoMessage("warn", "确定要删除此项吗？", "与此关联的所有图像的来源将被清空。此操作不可撤回。")) {
            if(await retrieveHelper.deleteData(id)) {
                if(paneState.detailPath.value === id) paneState.closeView()
            }
        }
    }

    return {deleteItem}
}

export function useSourceDataDetailPane() {
    const dialog = useDialogService()
    const router = useTabRoute()
    const browserTabs = useBrowserTabs()
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

    const sourceDataPath = computed(() => data.value !== null ? {sourceSite: data.value.sourceSite, sourceId: data.value.sourceId, sourcePart: null, sourcePartName: null} : null)

    const { data: relatedImages } = useFetchEndpoint({
        path: paneState.detailPath,
        get: client => client.sourceData.getRelatedImages,
        eventFilter: c => event => (event.eventType === "entity/source-data/updated" || event.eventType === "entity/source-data/deleted") && c.path !== null && event.site === c.path.sourceSite && event.sourceId === c.path.sourceId,
    })

    const openEditDialog = () => {
        if(data.value !== null) {
            dialog.sourceDataEditor.edit({sourceSite: data.value.sourceSite, sourceId: data.value.sourceId})
        }
    }

    const gotoIllust = (at?: "newTab" | "newWindow") => {
        if(data.value !== null) {
            if(at === "newTab") {
                browserTabs.newTab({routeName: "Illust", initializer: {source: {site: data.value.sourceSite, id: data.value.sourceId}}})
            }else if(at === "newWindow") {
                browserTabs.newWindow({routeName: "Illust", initializer: {source: {site: data.value.sourceSite, id: data.value.sourceId}}})
            }else{
                router.routePush({routeName: "Illust", initializer: {source: {site: data.value.sourceSite, id: data.value.sourceId}}})
            }
        }
    }

    const setSourceEditStatus = async (status: SourceEditStatus) => {
        return (status === data.value?.status) || await setData({status})
    }

    return {data, sourceDataPath, relatedImages, setSourceEditStatus, gotoIllust, openEditDialog}
}
