import { readonly, Ref, ref, watch } from "vue"
import { useLocalStorage } from "@/functions/app"
import { useCreatingHelper, useFetchEndpoint, useRetrieveHelper, ErrorHandler, QueryListview, usePostFetchHelper } from "@/functions/fetch"
import { flatResponse, mapResponse } from "@/functions/http-client"
import { DetailTopic, ParentTopic, Topic, TopicCreateForm, TopicUpdateForm, TopicExceptions, TopicQueryFilter, TopicType } from "@/functions/http-client/api/topic"
import { MappingSourceTag } from "@/functions/http-client/api/source-tag-mapping"
import { useNavigationItem } from "@/services/base/side-nav-records"
import { useListViewContext } from "@/services/base/list-view-context"
import { useDocumentTitle, useInitializer, usePath, useTabRoute } from "@/modules/browser"
import { useMessageBox } from "@/modules/message-box"
import { useToast } from "@/modules/toast"
import { checkTagName } from "@/utils/validation"
import { patchMappingSourceTagForm } from "@/utils/translation"
import { objects } from "@/utils/primitives"

export function useTopicContext() {
    const listview = useListView()

    const operators = useOperators(listview.listview)

    return {listview, operators}
}

function useListView() {
    return useListViewContext({
        defaultFilter: <TopicQueryFilter>{order: "-updateTime"},
        request: client => (offset, limit, filter) => client.topic.list({offset, limit, ...filter}),
        keyOf: item => item.id,
        eventFilter: {
            filter: ["entity/meta-tag/created", "entity/meta-tag/updated", "entity/meta-tag/deleted"],
            operation({ event, refresh, updateKey, removeKey }) {
                if(event.eventType === "entity/meta-tag/created" && event.metaType === "TOPIC") {
                    refresh()
                }else if(event.eventType === "entity/meta-tag/updated" && event.metaType === "TOPIC") {
                    updateKey(event.metaId)
                }else if(event.eventType === "entity/meta-tag/deleted" && event.metaType === "TOPIC") {
                    removeKey(event.metaId)
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.topic.get(a.id))))
        }
    })
}

function useOperators(listview: QueryListview<Topic, number>) {
    const toast = useToast()
    const message = useMessageBox()
    const router = useTabRoute()

    const retrieveHelper = useRetrieveHelper({
        update: client => client.topic.update,
        delete: client => client.topic.delete
    })

    const fetchFindSimilarTaskCreate = usePostFetchHelper(client => client.findSimilar.task.create)

    const openCreateView = () => router.routePush({routeName: "TopicCreate"})

    const openDetailView = (topicId: number) => router.routePush({routeName: "TopicDetail", path: topicId})

    const createByTemplate = (topic: Topic) => {
        listview.proxy.findByKey(topic.id).then(idx => {
            if(idx != undefined) {
                const topic = listview.proxy.sync.retrieve(idx)
                router.routePush({routeName: "TopicCreate", initializer: {createTemplate: topic}})
            }
        })
    }

    const createChildOfTemplate = (topic: Topic) => {
        listview.proxy.findByKey(topic.id).then(idx => {
            if(idx != undefined) {
                const topic = listview.proxy.sync.retrieve(idx)
                if(topic !== undefined) {
                    router.routePush({
                        routeName: "TopicCreate",
                        initializer: {
                            createTemplate: {
                                parents: [{
                                    id: topic.id,
                                    name: topic.name,
                                    type: topic.type,
                                    color: topic.color
                                }]
                            }
                        }
                    })
                }
            }
        })
    }

    const deleteItem = async (topic: Topic) => {
        if(await message.showYesNoMessage("warn", "确定要删除此项吗？", "此操作不可撤回。")) {
            await retrieveHelper.deleteData(topic.id)
        }
    }

    const toggleFavorite = async (topic: Topic, favorite: boolean) => {
        await retrieveHelper.setData(topic.id, {favorite})
    }

    const findSimilarOfTopic = async (topic: Topic) => {
        await fetchFindSimilarTaskCreate({selector: {type: "topic", topicIds: [topic.id]}})
        toast.toast("已创建", "success", "相似项查找任务已创建完成。")
    }

    const openIllustsOfTopic = (topic: Topic) => {
        router.routePush({routeName: "Illust", initializer: {topicName: topic.name}})
    }

    return {openCreateView, openDetailView, createByTemplate, createChildOfTemplate, deleteItem, toggleFavorite, findSimilarOfTopic, openIllustsOfTopic}
}

export function useTopicCreatePanel() {
    const router = useTabRoute()
    const message = useMessageBox()
    const cacheStorage = useLocalStorage<{cacheType: TopicType}>("topic/create-panel", {cacheType: "IP"})

    const form = ref(mapTemplateToCreateForm(null, cacheStorage.value.cacheType))

    const setProperty = <T extends keyof TopicCreateFormData>(key: T, value: TopicCreateFormData[T]) => {
        form.value[key] = value
    }

    const { submit } = useCreatingHelper({
        form,
        create: client => client.topic.create,
        mapForm: mapCreateFormToHelper,
        beforeCreate(form): boolean | void {
            if(!checkTagName(form.name)) {
                message.showOkMessage("prompt", "不合法的名称。", "名称不能为空，且不能包含 ` | 字符。")
                return false
            }
            for(const otherName of form.otherNames) {
                if(!checkTagName(otherName)) {
                    message.showOkMessage("prompt", "不合法的别名。", "别名不能包含 ` | 字符。")
                    return false
                }
            }
        },
        handleError(e) {
            if(e.code === "ALREADY_EXISTS") {
                message.showOkMessage("prompt", "该名称已存在。")
            }else if(e.code === "NOT_EXIST") {
                const [type, id] = e.info
                if(type === "parentId") {
                    message.showOkMessage("error", "选择的父主题不存在。", `错误项: ${id}`)
                }else if(type === "site") {
                    message.showOkMessage("error", `选择的来源站点不存在。`, `错误项: ${id}`)
                }else if(type === "sourceTagType") {
                    message.showOkMessage("error", `选择的来源标签类型不存在。`, `错误项: ${id.join(", ")}`)
                }else{
                    message.showOkMessage("error", `选择的资源${type}不存在。`, `错误项: ${id}`)
                }
            }else if(e.code === "RECURSIVE_PARENT") {
                message.showOkMessage("prompt", "无法应用此父主题。", "此父主题与当前主题存在闭环。")
            }else if(e.code === "ILLEGAL_CONSTRAINT") {
                message.showOkMessage("prompt", "无法应用主题类型。", "当前主题的类型与其与父主题/子主题不能兼容。考虑更改父主题，或更改当前主题的类型。")
            }else{
                return e
            }
        },
        afterCreate(result) {
            router.routeReplace({routeName: "TopicDetail", path: result.id})
        }
    })

    watch(() => form.value.type, topicType => {
        if(topicType !== cacheStorage.value.cacheType) {
            cacheStorage.value.cacheType = topicType
        }
    })

    useInitializer(params => {if(params.createTemplate) form.value = mapTemplateToCreateForm(params.createTemplate, cacheStorage.value.cacheType)})

    return {form, setProperty, submit}
}

export function useTopicDetailPanel() {
    const router = useTabRoute()
    const message = useMessageBox()

    const path = usePath<number>()

    const { data, setData, deleteData } = useFetchEndpoint({
        path,
        get: client => client.topic.get,
        update: client => client.topic.update,
        delete: client => client.topic.delete,
        eventFilter: c => event => (event.eventType === "entity/meta-tag/updated" || event.eventType === "entity/meta-tag/deleted") && event.metaType === "TOPIC" && event.metaId === c.path,
        afterRetrieve(path, data) {
            if(path !== null && data === null) {
                router.routeClose()
            }
        }
    })

    const { data: exampleData } = useFetchEndpoint({
        path,
        get: client => async (topic: number) => mapResponse(await client.illust.list({limit: 10, topic, type: "COLLECTION", order: "-orderTime"}), r => r.result)
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
            router.routePush({routeName: "TopicCreate", initializer: {createTemplate: data.value}})
        }
    }

    const createChildOfTemplate = () => {
        if(data.value !== null) {
            router.routePush({
                routeName: "TopicCreate",
                initializer: {
                    createTemplate: {
                        parents: [{
                            id: data.value.id,
                            name: data.value.name,
                            type: data.value.type,
                            color: data.value.color
                        }]
                    }
                }
            })
        }
    }

    const openTopicDetail = (topicId: number) => {
        router.routePush({routeName: "TopicDetail", path: topicId})
    }

    const deleteItem = async () => {
        if(await message.showYesNoMessage("warn", "确定要删除此项吗？", "此操作不可撤回。")) {
            if(await deleteData()) {
                router.routeClose()
            }
        }
    }

    useNavigationItem(data)

    useDocumentTitle(data)

    return {data, childrenMode, exampleData, editor, operators: {toggleFavorite, createByTemplate, createChildOfTemplate, openTopicDetail, deleteItem}}
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

    const cancel = () => {
        editMode.value = false
        form.value = null
    }
    
    const save = async () => {
        if(form.value && data.value) {
            const updateForm: TopicUpdateForm = {
                type: form.value.type !== data.value.type ? form.value.type : undefined,
                parentId: (form.value.parent?.id ?? null) !== data.value.parentId ? (form.value.parent?.id ?? null) : undefined,
                keywords: !objects.deepEquals(form.value.keywords, data.value.keywords) ? form.value.keywords : undefined,
                description: form.value.description !== data.value.description ? form.value.description : undefined,
                score: form.value.score !== data.value.score ? form.value.score : undefined,
                mappingSourceTags: !objects.deepEquals(form.value.mappingSourceTags, data.value.mappingSourceTags) ? patchMappingSourceTagForm(form.value.mappingSourceTags, data.value.mappingSourceTags) : undefined
            }
            
            if(form.value.name !== data.value.name) {
                if(!checkTagName(form.value.name)) {
                    message.showOkMessage("prompt", "不合法的名称。", "名称不能为空，且不能包含 ` | 字符。")
                    return
                }
                updateForm.name = form.value.name
            }
            if(!objects.deepEquals(form.value.otherNames, data.value.otherNames)) {
                for(const otherName of form.value.otherNames) {
                    if(!checkTagName(otherName)) {
                        message.showOkMessage("prompt", "不合法的别名。", "别名不能为空，且不能包含 ` | 字符。")
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
                    if(type === "parentId") {
                        message.showOkMessage("error", "选择的父主题不存在。", `错误项: ${id}`)
                    }else if(type === "site") {
                        message.showOkMessage("error", `选择的来源站点不存在。`, `错误项: ${id}`)
                    }else if(type === "sourceTagType") {
                        message.showOkMessage("error", `选择的来源标签类型不存在。`, `错误项: ${id.join(", ")}`)
                    }else{
                        message.showOkMessage("error", `选择的资源${type}不存在。`, `错误项: ${id}`)
                    }
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

    return {editMode: readonly(editMode), form, setProperty, edit, cancel, save}
}

interface TopicCreateFormData extends TopicUpdateFormData {
    favorite: boolean
}

interface TopicUpdateFormData {
    name: string
    otherNames: string[]
    type: TopicType
    parent: ParentTopic | null
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
        score: data.score,
        mappingSourceTags: data.mappingSourceTags
    }
}
