import { installVirtualViewNavigation } from "@/components/data"
import { useLocalStorage } from "@/functions/app"
import { useCreatingHelper, useRetrieveHelper } from "@/functions/fetch"
import { flatResponse } from "@/functions/http-client"
import { DetailTopic, ParentTopic, TopicCreateForm, TopicQueryFilter, TopicType } from "@/functions/http-client/api/topic"
import { SimpleAnnotation } from "@/functions/http-client/api/annotations"
import { MappingSourceTag } from "@/functions/http-client/api/source-tag-mapping"
import { DetailViewState, useDetailViewState } from "@/services/base/navigation"
import { useListViewContext } from "@/services/base/list-context"
import { usePopupMenu } from "@/modules/popup-menu"
import { useMessageBox } from "@/modules/message-box"
import { checkTagName } from "@/utils/validation"
import { patchMappingSourceTagForm } from "@/utils/translation"
import { computedWatchMutable, installation } from "@/utils/reactivity"

export const [installTopicContext, useTopicContext] = installation(function () {
    const paneState = useDetailViewState<number, Partial<DetailTopic>>()

    const listview = useListView(paneState)

    installVirtualViewNavigation()

    return {paneState, listview}
})

function useListView(paneState: DetailViewState<number, Partial<DetailTopic>>) {
    const message = useMessageBox()

    const list = useListViewContext({
        defaultFilter: <TopicQueryFilter>{order: "-updateTime"},
        request: client => (offset, limit, filter) => client.topic.list({offset, limit, ...filter}),
        eventFilter: {
            filter: ["entity/meta-tag/created", "entity/meta-tag/updated", "entity/meta-tag/deleted"],
            operation({ event, refresh, update, remove }) {
                if(event.eventType === "entity/meta-tag/created" && event.metaType === "TOPIC") {
                    refresh()
                }else if(event.eventType === "entity/meta-tag/updated" && event.metaType === "TOPIC") {
                    update(i => i.id === event.metaId)
                }else if(event.eventType === "entity/meta-tag/deleted" && event.metaType === "TOPIC") {
                    remove(i => i.id === event.metaId)
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.topic.get(a.id))))
        }
    })

    const retrieveHelper = useRetrieveHelper({
        update: client => client.topic.update,
        delete: client => client.topic.delete
    })

    const createByTemplate = (id: number) => {
        const idx = list.listview.proxy.syncOperations.find(a => a.id === id)
        if(idx != undefined) {
            const topic = list.listview.proxy.syncOperations.retrieve(idx)
            paneState.createView(topic)
        }
    }

    const createChildOfTemplate = (id: number) => {
        const idx = list.listview.proxy.syncOperations.find(a => a.id === id)
        if(idx != undefined) {
            const topic = list.listview.proxy.syncOperations.retrieve(idx)
            if(topic !== undefined) {
                paneState.createView({
                    parents: [{
                        id: topic.id,
                        name: topic.name,
                        type: topic.type,
                        color: topic.color
                    }]
                })
            }
        }
    }

    const deleteItem = async (id: number) => {
        if(await message.showYesNoMessage("warn", "确定要删除此项吗？", "此操作不可撤回。")) {
            if(await retrieveHelper.deleteData(id)) {
                if(paneState.isDetailView(id)) paneState.closeView()
            }
        }
    }

    const toggleFavorite = async (topicId: number, favorite: boolean) => {
        await retrieveHelper.setData(topicId, {favorite})
    }

    const popupMenu = usePopupMenu<number>([
        {type: "normal", label: "查看详情", click: paneState.detailView},
        {type: "separator"},
        {type: "normal", label: "新建子主题", click: createChildOfTemplate},
        {type: "normal", label: "以此为模板新建", click: createByTemplate},
        {type: "separator"},
        {type: "normal", label: "删除此主题", click: deleteItem},
    ])

    return {...list, popupMenu, toggleFavorite}
}

export function useTopicCreatePanel() {
    const message = useMessageBox()
    const { paneState } = useTopicContext()
    const cacheStorage = useLocalStorage<{cacheType: TopicType}>("topic/create-panel", {cacheType: "IP"})

    type FormData = FormEditorData & { favorite: boolean }

    function mapCreateForm(template: Partial<DetailTopic> | null): FormData {
        return {
            name: template?.name ?? "",
            otherNames: template?.otherNames ?? [],
            parent: template?.parents?.length ? template.parents[template.parents.length - 1] : null,
            type: template?.type ?? cacheStorage.value.cacheType,
            description: template?.description ?? "",
            keywords: template?.keywords ?? [],
            favorite: template?.favorite ?? false,
            annotations: template?.annotations ?? [],
            score: template?.score ?? null,
            mappingSourceTags: template?.mappingSourceTags ?? []
        }
    }

    function mapFormToHelper(form: FormData): TopicCreateForm {
        return {
            name: form.name,
            otherNames: form.otherNames,
            parentId: form.parent?.id,
            type: form.type,
            description: form.description,
            keywords: form.keywords,
            favorite: form.favorite,
            annotations: form.annotations.map(a => a.id),
            score: form.score,
            mappingSourceTags: patchMappingSourceTagForm(form.mappingSourceTags, [])
        }
    }

    const form = computedWatchMutable(paneState.createTemplate, () => mapCreateForm(paneState.createTemplate.value))

    function setProperty<T extends keyof FormData>(key: T, value: FormData[T]) {
        form.value[key] = value
    }

    const { submit } = useCreatingHelper({
        form,
        create: client => client.topic.create,
        mapForm: mapFormToHelper,
        beforeCreate(form): boolean | void {
            if(!checkTagName(form.name)) {
                message.showOkMessage("prompt", "不合法的名称。", "名称不能为空，且不能包含 ` \" ' . | 字符。")
                return false
            }
            for(const otherName of form.otherNames) {
                if(!checkTagName(otherName)) {
                    message.showOkMessage("prompt", "不合法的别名。", "别名不能包含 ` \" ' . | 字符。")
                    return false
                }
            }
        },
        handleError(e) {
            if(e.code === "ALREADY_EXISTS") {
                message.showOkMessage("prompt", "该名称已存在。")
            }else if(e.code === "NOT_EXIST") {
                const [type, id] = e.info
                if(type === "annotations") {
                    message.showOkMessage("error", "选择的注解不存在。", `错误项: ${id}`)
                }else if(type === "parentId") {
                    message.showOkMessage("error", "选择的父主题不存在。", `错误项: ${id}`)
                }else{
                    message.showOkMessage("error", `选择的资源${type}不存在。`, `错误项: ${id}`)
                }
            }else if(e.code === "NOT_SUITABLE") {
                const [, ids] = e.info
                const content = ids.map(id => form.value.annotations?.find(i => i.id === id)?.name ?? "unknown").join(", ")
                message.showOkMessage("error", "选择的注解不可用。", `选择的注解的导出目标设置使其无法导出至当前主题类型。错误项: ${content}`)
            }else if(e.code === "RECURSIVE_PARENT") {
                message.showOkMessage("prompt", "无法应用此父主题。", "此父主题与当前主题存在闭环。")
            }else if(e.code === "ILLEGAL_CONSTRAINT") {
                message.showOkMessage("prompt", "无法应用主题类型。", "当前主题的类型与其与父主题/子主题不能兼容。考虑更改父主题，或更改当前主题的类型。")
            }else{
                return e
            }
        },
        afterCreate(result) {
            paneState.detailView(result.id)
        }
    })

    return {form, setProperty, submit}
}

export interface FormEditorData {
    name: string
    otherNames: string[]
    type: TopicType
    parent: ParentTopic | null
    annotations: SimpleAnnotation[]
    keywords: string[]
    description: string
    score: number | null
    mappingSourceTags: MappingSourceTag[]
}
