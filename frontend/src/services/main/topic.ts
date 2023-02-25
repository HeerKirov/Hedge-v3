import { readonly, Ref, ref, watch } from "vue"
import { installVirtualViewNavigation } from "@/components/data"
import { useLocalStorage } from "@/functions/app"
import {useCreatingHelper, useFetchEndpoint, useRetrieveHelper, ErrorHandler, QueryListview} from "@/functions/fetch"
import { flatResponse } from "@/functions/http-client"
import {
    DetailTopic, ParentTopic, Topic,
    TopicCreateForm, TopicUpdateForm, TopicExceptions,
    TopicQueryFilter, TopicType
} from "@/functions/http-client/api/topic"
import { SimpleAnnotation } from "@/functions/http-client/api/annotations"
import { MappingSourceTag } from "@/functions/http-client/api/source-tag-mapping"
import { DetailViewState, useDetailViewState } from "@/services/base/detail-view-state"
import { useNavHistoryPush } from "@/services/base/side-nav-menu"
import { useListViewContext } from "@/services/base/list-view-context"
import { useMessageBox } from "@/modules/message-box"
import { checkTagName } from "@/utils/validation"
import { patchMappingSourceTagForm } from "@/utils/translation"
import { computedWatchMutable, installation } from "@/utils/reactivity"
import { objects } from "@/utils/primitives"

export const [installTopicContext, useTopicContext] = installation(function () {
    const paneState = useDetailViewState<number, Partial<DetailTopic>>()

    const listview = useListView()

    const operators = useOperators(paneState, listview.listview)

    installVirtualViewNavigation()

    return {paneState, listview, operators}
})

function useListView() {
    return useListViewContext({
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
}

function useOperators(paneState: DetailViewState<number, Partial<DetailTopic>>, listview: QueryListview<Topic>) {
    const message = useMessageBox()

    const retrieveHelper = useRetrieveHelper({
        update: client => client.topic.update,
        delete: client => client.topic.delete
    })

    const createByTemplate = (id: number) => {
        const idx = listview.proxy.syncOperations.find(a => a.id === id)
        if(idx != undefined) {
            const topic = listview.proxy.syncOperations.retrieve(idx)
            paneState.openCreateView(topic)
        }
    }

    const createChildOfTemplate = (id: number) => {
        const idx = listview.proxy.syncOperations.find(a => a.id === id)
        if(idx != undefined) {
            const topic = listview.proxy.syncOperations.retrieve(idx)
            if(topic !== undefined) {
                paneState.openCreateView({
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
                if(paneState.detailPath.value === id) paneState.closeView()
            }
        }
    }

    const toggleFavorite = async (topicId: number, favorite: boolean) => {
        await retrieveHelper.setData(topicId, {favorite})
    }

    return {createByTemplate, createChildOfTemplate, deleteItem, toggleFavorite}
}

export function useTopicCreatePanel() {
    const message = useMessageBox()
    const { paneState } = useTopicContext()
    const cacheStorage = useLocalStorage<{cacheType: TopicType}>("topic/create-panel", {cacheType: "IP"})

    const form = computedWatchMutable(paneState.createTemplate, () => mapTemplateToCreateForm(paneState.createTemplate.value, cacheStorage.value.cacheType))

    const setProperty = <T extends keyof TopicCreateFormData>(key: T, value: TopicCreateFormData[T]) => {
        form.value[key] = value
    }

    const { submit } = useCreatingHelper({
        form,
        create: client => client.topic.create,
        mapForm: mapCreateFormToHelper,
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
            paneState.openDetailView(result.id)
        }
    })

    watch(() => form.value.type, topicType => {
        if(topicType !== cacheStorage.value.cacheType) {
            cacheStorage.value.cacheType = topicType
        }
    })

    return {form, setProperty, submit}
}

export function useTopicDetailPanel() {
    const message = useMessageBox()
    const { paneState } = useTopicContext()

    const { data, setData, deleteData } = useFetchEndpoint({
        path: paneState.detailPath,
        get: client => client.topic.get,
        update: client => client.topic.update,
        delete: client => client.topic.delete,
        eventFilter: c => event => (event.eventType === "entity/meta-tag/updated" || event.eventType === "entity/meta-tag/deleted") && event.metaType === "TOPIC" && event.metaId === c.path,
        afterRetrieve(path, data) {
            if(path !== null && data === null) {
                paneState.closeView()
            }
        }
    })

    const childrenMode = useLocalStorage<"tree" | "list">("topic/detail-panel/children-view-mode", "tree")

    const editor = useTopicDetailPanelEditor(data, setData)

    const toggleFavorite = async () => {
        if(data.value !== null) {
            await setData({favorite: !data.value.favorite})
        }
    }

    const createByTemplate = () => {
        if(data.value !== null) {
            paneState.openCreateView(data.value)
        }
    }

    const createChildOfTemplate = () => {
        if(data.value !== null) {
            paneState.openCreateView({
                parents: [{
                    id: data.value.id,
                    name: data.value.name,
                    type: data.value.type,
                    color: data.value.color
                }]
            })
        }
    }

    const deleteItem = async () => {
        if(await message.showYesNoMessage("warn", "确定要删除此项吗？", "此操作不可撤回。")) {
            if(await deleteData()) {
                paneState.closeView()
            }
        }
    }

    useNavHistoryPush(data)

    return {data, childrenMode, editor, operators: {toggleFavorite, createByTemplate, createChildOfTemplate, deleteItem}}
}

function useTopicDetailPanelEditor(data: Readonly<Ref<DetailTopic | null>>, setData: (form: TopicUpdateForm, handle: ErrorHandler<TopicExceptions["update"]>) => Promise<boolean>) {
    const message = useMessageBox()
    
    const editMode = ref(false)

    const form = ref<TopicUpdateFormData | null>(null)

    const setProperty = <T extends keyof TopicUpdateFormData>(key: T, value: TopicUpdateFormData[T]) => {
        form.value![key] = value
    }
    
    const edit = () => {
        if(data.value !== null) {
            form.value = mapDataToUpdateForm(data.value)
            editMode.value = true
        }
    }
    
    const save = async () => {
        if(form.value && data.value) {
            const updateForm: TopicUpdateForm = {
                type: form.value.type !== data.value.type ? form.value.type : undefined,
                parentId: (form.value.parent?.id ?? null) !== data.value.parentId ? (form.value.parent?.id ?? null) : undefined,
                annotations: !objects.deepEquals(form.value.annotations.map(i => i.id), data.value.annotations.map(i => i.id)) ? form.value.annotations.map(i => i.id) : undefined,
                keywords: !objects.deepEquals(form.value.keywords, data.value.keywords) ? form.value.keywords : undefined,
                description: form.value.description !== data.value.description ? form.value.description : undefined,
                score: form.value.score !== data.value.score ? form.value.score : undefined,
                mappingSourceTags: !objects.deepEquals(form.value.mappingSourceTags, data.value.mappingSourceTags) ? patchMappingSourceTagForm(form.value.mappingSourceTags, data.value.mappingSourceTags) : undefined
            }
            
            if(form.value.name !== data.value.name) {
                if(!checkTagName(form.value.name)) {
                    message.showOkMessage("prompt", "不合法的名称。", "名称不能为空，且不能包含 ` \" ' . | 字符。")
                    return
                }
                updateForm.name = form.value.name
            }
            if(!objects.deepEquals(form.value.otherNames, data.value.otherNames)) {
                for(const otherName of form.value.otherNames) {
                    if(!checkTagName(otherName)) {
                        message.showOkMessage("prompt", "不合法的别名。", "别名不能为空，且不能包含 ` \" ' . | 字符。")
                        return
                    }
                }
                updateForm.otherNames = form.value.otherNames
            }

            const r = !Object.values(form).filter(i => i !== undefined).length || await setData(updateForm, e => {
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
                    const [, id] = e.info
                    const content = id.map(id => form.value?.annotations?.find(i => i.id === id)?.name ?? "unknown").join(", ")

                    message.showOkMessage("error", "选择的注解不可用。", `选择的注解的导出目标设置使其无法导出至当前主题类型。错误项: ${content}`)
                }else if(e.code === "RECURSIVE_PARENT") {
                    message.showOkMessage("prompt", "无法应用此父主题。", "此父主题与当前主题存在闭环。")
                }else if(e.code === "ILLEGAL_CONSTRAINT") {
                    message.showOkMessage("prompt", "无法应用主题类型。", "当前主题的类型与其与父主题/子主题不能兼容。考虑更改父主题，或更改当前主题的类型。")
                }else{
                    return e
                }
            })
            if(r) {
                editMode.value = false
            }
        }
    }

    return {editMode: readonly(editMode), form, setProperty, edit, save}
}

interface TopicCreateFormData extends TopicUpdateFormData {
    favorite: boolean
}

interface TopicUpdateFormData {
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

function mapTemplateToCreateForm(template: Partial<DetailTopic> | null, defaultType: TopicType): TopicCreateFormData {
    return {
        name: template?.name ?? "",
        otherNames: template?.otherNames ?? [],
        parent: template?.parents?.length ? template.parents[template.parents.length - 1] : null,
        type: template?.type ?? defaultType,
        description: template?.description ?? "",
        keywords: template?.keywords ?? [],
        favorite: template?.favorite ?? false,
        annotations: template?.annotations ?? [],
        score: template?.score ?? null,
        mappingSourceTags: template?.mappingSourceTags ?? []
    }
}

function mapCreateFormToHelper(form: TopicCreateFormData): TopicCreateForm {
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

function mapDataToUpdateForm(data: DetailTopic): TopicUpdateFormData {
    return {
        name: data.name,
        otherNames: data.otherNames,
        parent: data.parents?.length ? data.parents[data.parents.length - 1] : null,
        type: data.type,
        description: data.description,
        keywords: data.keywords,
        annotations: data.annotations,
        score: data.score,
        mappingSourceTags: data.mappingSourceTags
    }
}
