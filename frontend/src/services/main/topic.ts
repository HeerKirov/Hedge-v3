import { ref } from "vue"
import { useCreatingHelper, useFetchEndpoint, useRetrieveHelper, QueryListview, usePostFetchHelper } from "@/functions/fetch"
import { flatResponse, mapResponse } from "@/functions/http-client"
import { DetailTopic, ParentTopic, Topic, TopicCreateForm, TopicQueryFilter, TopicType } from "@/functions/http-client/api/topic"
import { MappingSourceTag } from "@/functions/http-client/api/source-tag-mapping"
import { useNavigationItem } from "@/services/base/side-nav-records"
import { useListViewContext } from "@/services/base/list-view-context"
import { useDocumentTitle, useInitializer, useParam, usePath, useTabRoute } from "@/modules/browser"
import { useMessageBox } from "@/modules/message-box"
import { useToast } from "@/modules/toast"
import { checkTagName } from "@/utils/validation"
import { patchMappingSourceTagForm, translateTopicQueryFilterToString } from "@/utils/translation"
import { objects } from "@/utils/primitives"

export function useTopicContext() {
    const listview = useListView()

    const operators = useOperators(listview.listview)

    useDocumentTitle(() => translateTopicQueryFilterToString(listview.queryFilter.value, {order: "-updateTime"}), {asSuffix: true})

    return {listview, operators}
}

function useListView() {
    const filter = useParam<TopicQueryFilter>("filter", () => ({order: "-updateTime"}), true)
    
    return useListViewContext({
        filter,
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

    const openBooksOfTopic = (topic: Topic) => {
        router.routePush({routeName: "Book", initializer: {topicName: topic.name}})
    }

    return {openCreateView, openDetailView, createChildOfTemplate, deleteItem, toggleFavorite, findSimilarOfTopic, openIllustsOfTopic, openBooksOfTopic}
}

export function useTopicCreatePanel() {
    const router = useTabRoute()
    const message = useMessageBox()

    const form = ref(mapTemplateToCreateForm(null, "CHARACTER"))

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
        },
        validate: {
            fields: ["name"],
            beforeValidate(form): boolean | void {
                if(form.name === "") return false
            },
            handleError(e) {
                if(e.code === "ALREADY_EXISTS") {
                    message.showOkMessage("prompt", "该名称已存在。")
                }else{
                    return e
                }
            }
        }
    })

    useInitializer(params => {if(params.createTemplate) form.value = mapTemplateToCreateForm(params.createTemplate, "CHARACTER")})

    return {form, submit}
}

export function useTopicDetailPanel() {
    const toast = useToast()
    const router = useTabRoute()
    const message = useMessageBox()

    const fetchFindSimilarTaskCreate = usePostFetchHelper(client => client.findSimilar.task.create)

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

    const toggleFavorite = async () => {
        if(data.value !== null) {
            await setData({favorite: !data.value.favorite})
        }
    }

    const setName = async ([name, otherNames]: [string, string[]]) => {
        if(!checkTagName(name)) {
            message.showOkMessage("prompt", "不合法的名称。", "名称不能为空，且不能包含 ` | 字符。")
            return false
        }
        if(otherNames.some(n => !checkTagName(n))) {
            message.showOkMessage("prompt", "不合法的别名。", "别名不能为空，且不能包含 ` | 字符。")
            return false
        }

        const nameNotChanged = name === data.value?.name
        const otherNamesNotChanged = objects.deepEquals(otherNames, data.value?.otherNames)

        return (nameNotChanged && otherNamesNotChanged) || await setData({
            name: nameNotChanged ? undefined : name,
            otherNames: otherNamesNotChanged ? undefined : otherNames
        }, e => {
            if (e.code === "ALREADY_EXISTS") {
                message.showOkMessage("prompt", "该名称已存在。")
            } else {
                return e
            }
        })
    }

    const setDescription = async (description: string) => {
        return description === data.value?.description || await setData({ description })
    }

    const setKeywords = async (keywords: string[]) => {
        return objects.deepEquals(keywords, data.value?.keywords) || await setData({ keywords })
    }

    const setScore = async (score: number | null) => {
        return score === data.value?.score || await setData({ score })
    }

    const setType = async (type: TopicType) => {
        return type === data.value?.type || await setData({ type })
    }

    const setParent = async (parent: ParentTopic | null) => {
        return parent?.id === data.value?.parentId || await setData({ parentId: parent?.id ?? null }, e => {
            if(e.code === "NOT_EXIST") {
                const [type, id] = e.info
                if(type === "parentId") {
                    message.showOkMessage("error", "选择的父主题不存在。", `错误项: ${id}`)
                }else{
                    return e
                }
            }else if(e.code === "RECURSIVE_PARENT") {
                message.showOkMessage("prompt", "无法应用此父主题。", "此父主题与当前主题存在闭环。")
            }else if(e.code === "ILLEGAL_CONSTRAINT") {
                message.showOkMessage("prompt", "无法应用主题类型。", "当前主题的类型与其与父主题/子主题不能兼容。考虑更改父主题，或更改当前主题的类型。")
            }else{
                return e
            }
        })
    }

    const setMappingSourceTags = async (mappingSourceTags: MappingSourceTag[]) => {
        //由于mapping source tags的编辑模式，需要在提交之前做一次过滤
        const final: MappingSourceTag[] = mappingSourceTags.filter(t => t.site && t.code)

        return objects.deepEquals(final, data.value?.mappingSourceTags) || await setData({
            mappingSourceTags: patchMappingSourceTagForm(mappingSourceTags, data.value?.mappingSourceTags ?? [])
        }, e => {
            if(e.code === "NOT_EXIST") {
                const [type, id] = e.info
                if(type === "site") {
                    message.showOkMessage("error", `选择的来源站点不存在。`, `错误项: ${id}`)
                }else if(type === "sourceTagType") {
                    message.showOkMessage("error", `选择的来源标签类型不存在。`, `错误项: ${id.join(", ")}`)
                }
            }else{
                return e
            }
        })
    }

    const findSimilarOfTopic = async () => {
        await fetchFindSimilarTaskCreate({selector: {type: "topic", topicIds: [data.value!.id]}})
        toast.toast("已创建", "success", "相似项查找任务已创建完成。")
    }

    const openIllustsOfTopic = () => {
        router.routePush({routeName: "Illust", initializer: {topicName: data.value!.name}})
    }

    const openBooksOfTopic = () => {
        router.routePush({routeName: "Book", initializer: {topicName: data.value!.name}})
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

    return {
        data, 
        toggleFavorite, setName, setDescription, setKeywords, setScore, setType, setParent, setMappingSourceTags, 
        findSimilarOfTopic, openIllustsOfTopic, openBooksOfTopic, createChildOfTemplate, openTopicDetail, deleteItem
    }
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
