import { flatResponse } from "@/functions/http-client"
import { Annotation, AnnotationCreateForm, AnnotationQueryFilter, AnnotationTarget } from "@/functions/http-client/api/annotations"
import { QueryListview, useCreatingHelper, useFetchEndpoint, useRetrieveHelper } from "@/functions/fetch"
import { useMessageBox } from "@/modules/message-box"
import { useListViewContext } from "@/services/base/list-view-context"
import { DetailViewState, useDetailViewState } from "@/services/base/detail-view-state"
import { computedWatchMutable, installation } from "@/utils/reactivity"
import { checkTagName } from "@/utils/validation"
import { objects } from "@/utils/primitives"

export const [installAnnotationContext, useAnnotationContext] = installation(function () {
    const paneState = useDetailViewState<number, Partial<Annotation>>()

    const listview = useListView()

    const operators = useOperators(paneState, listview.listview)

    return {paneState, listview, operators}
})

function useListView() {
    const list = useListViewContext({
        defaultFilter: <AnnotationQueryFilter>{type: "TOPIC", order: "-createTime"},
        request: client => (offset, limit, filter) => client.annotation.list({offset, limit, ...filter}),
        keyOf: item => item.id,
        eventFilter: {
            filter: ["entity/annotation/created", "entity/annotation/updated", "entity/annotation/deleted"],
            operation({ event, refresh, updateKey, removeKey }) {
                if(event.eventType === "entity/annotation/created" && event.type === list.queryFilter.value.type) {
                    refresh()
                }else if(event.eventType === "entity/annotation/updated" && event.type === list.queryFilter.value.type) {
                    updateKey(event.annotationId)
                }else if(event.eventType === "entity/annotation/deleted" && event.type === list.queryFilter.value.type) {
                    removeKey(event.annotationId)
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.annotation.get(a.id))))
        }
    })

    return list
}

function useOperators(paneState: DetailViewState<number, Partial<Annotation>>, listview: QueryListview<Annotation, number>) {
    const message = useMessageBox()

    const retrieveHelper = useRetrieveHelper({
        delete: client => client.annotation.delete
    })

    const createByTemplate = (id: number) => {
        listview.proxy.findByKey(id).then(idx => {
            if(idx != undefined) {
                const annotation = listview.proxy.sync.retrieve(idx)
                paneState.openCreateView(annotation)
            }
        })
    }

    const deleteItem = async (id: number) => {
        if(await message.showYesNoMessage("warn", "确定要删除此项吗？", "此操作不可撤回。")) {
            if(await retrieveHelper.deleteData(id)) {
                if(paneState.detailPath.value === id) paneState.closeView()
            }
        }
    }

    return {createByTemplate, deleteItem}
}

export function useAnnotationCreatePane() {
    const message = useMessageBox()
    const { paneState } = useAnnotationContext()

    const form = computedWatchMutable(paneState.createTemplate, () => mapTemplateToCreateForm(paneState.createTemplate.value))

    const { submit } = useCreatingHelper({
        form,
        mapForm: f => f,
        create: client => client.annotation.create,
        beforeCreate(form): boolean | void {
            if(!checkTagName(form.name)) {
                message.showOkMessage("prompt", "不合法的名称。", "名称不能为空，且不能包含 ` \" ' . | 字符。")
                return false
            }
        },
        handleError(e) {
            if(e.code === "ALREADY_EXISTS") {
                message.showOkMessage("prompt", "该名称已存在。")
            }else{
                return e
            }
        },
        afterCreate(result) {
            paneState.openDetailView(result.id)
        }
    })

    return {form, submit}
}

export function useAnnotationDetailPane() {
    const message = useMessageBox()
    const { paneState } = useAnnotationContext()

    const { data, setData } = useFetchEndpoint({
        path: paneState.detailPath,
        get: client => client.annotation.get,
        update: client => client.annotation.update,
        delete: client => client.annotation.delete,
        eventFilter: c => event => (event.eventType === "entity/annotation/updated" || event.eventType === "entity/annotation/deleted") && event.annotationId === c.path,
        afterRetrieve(path, data) {
            if(path !== null && data === null) {
                paneState.closeView()
            }
        }
    })

    const setName = async (name: string) => {
        if(!checkTagName(name)) {
            message.showOkMessage("prompt", "不合法的名称。", "名称不能为空，且不能包含 ` \" ' . | 字符。")
            return false
        }
        return name === data.value?.name || await setData({ name }, e => {
            if (e.code === "ALREADY_EXISTS") {
                message.showOkMessage("prompt", "该名称已存在。")
            } else {
                return e
            }
        })
    }

    const setCanBeExported = async (canBeExported: boolean) => {
        return canBeExported === data.value?.canBeExported || await setData({ canBeExported })
    }

    const setAnnotationTarget = async (target: AnnotationTarget[]) => {
        return objects.deepEquals(target, data.value?.target) || await setData({ target })
    }

    return {data, setName, setCanBeExported, setAnnotationTarget}
}

function mapTemplateToCreateForm(template: Partial<Annotation> | null): AnnotationCreateForm {
    return {
        name: template?.name ?? "",
        type: template?.type ?? "TOPIC",
        canBeExported: template?.canBeExported ?? false,
        target: template?.target ?? []
    }
}
