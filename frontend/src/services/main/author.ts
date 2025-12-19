import { Ref, ref, watch } from "vue"
import { QueryListview, useCreatingHelper, useFetchEndpoint, useFetchHelper, usePostFetchHelper, useRetrieveHelper } from "@/functions/fetch"
import { flatResponse, mapResponse } from "@/functions/http-client"
import { Author, DetailAuthor, AuthorCreateForm, AuthorQueryFilter, AuthorType } from "@/functions/http-client/api/author"
import { MappingSourceTag, MappingSourceTagForm } from "@/functions/http-client/api/source-tag-mapping"
import { useNavigationItem } from "@/services/base/side-nav-records"
import { useListViewContext } from "@/services/base/list-view-context"
import { useMessageBox } from "@/modules/message-box"
import { useToast } from "@/modules/toast"
import { useInitializer, usePath, useTabRoute, useDocumentTitle, useParam } from "@/modules/browser"
import { checkTagName } from "@/utils/validation"
import { patchMappingSourceTagForm, translateAuthorQueryFilterToString } from "@/utils/translation"
import { installation } from "@/utils/reactivity"
import { objects } from "@/utils/primitives"

export const [installAuthorContext, useAuthorContext] = installation(function () {
    const listview = useListView()

    const operators = useOperators(listview.listview)

    const thumbnailLoadingCache = useListThumbnailLoadingCache()

    useDocumentTitle(() => translateAuthorQueryFilterToString(listview.queryFilter.value, {order: "-updateTime"}), {asSuffix: true})

    return {listview, operators, thumbnailLoadingCache}
})

function useListView() {
    const filter = useParam<AuthorQueryFilter>("filter", () => ({order: "-updateTime"}), true)

    return useListViewContext({
        filter,
        request: client => (offset, limit, filter) => client.author.list({offset, limit, ...filter}),
        keyOf: item => item.id,
        eventFilter: {
            filter: ["entity/meta-tag/created", "entity/meta-tag/updated", "entity/meta-tag/deleted"],
            operation({ event, refresh, updateKey, removeKey }) {
                if(event.eventType === "entity/meta-tag/created" && event.metaType === "AUTHOR") {
                    refresh()
                }else if(event.eventType === "entity/meta-tag/updated" && event.metaType === "AUTHOR") {
                    updateKey(event.metaId)
                }else if(event.eventType === "entity/meta-tag/deleted" && event.metaType === "AUTHOR") {
                    removeKey(event.metaId)
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.author.get(a.id))))
        }
    })
}

function useOperators(listview: QueryListview<Author, number>) {
    const toast = useToast()
    const message = useMessageBox()
    const router = useTabRoute()

    const retrieveHelper = useRetrieveHelper({
        update: client => client.author.update,
        delete: client => client.author.delete
    })

    const fetchFindSimilarTaskCreate = usePostFetchHelper(client => client.findSimilar.task.create)

    const openCreateView = () => router.routePush({routeName: "AuthorCreate"})

    const openDetailView = (authorId: number) => router.routePush({routeName: "AuthorDetail", path: authorId})

    const deleteItem = async (author: Author) => {
        if(await message.showYesNoMessage("warn", "确定要删除此项吗？", "此操作不可撤回。")) {
            await retrieveHelper.deleteData(author.id)
        }
    }

    const toggleFavorite = async (author: Author, favorite: boolean) => {
        await retrieveHelper.setData(author.id, {favorite})
    }

    const findSimilarOfAuthor = async (author: Author) => {
        await fetchFindSimilarTaskCreate({selector: {type: "author", authorIds: [author.id]}})
        toast.toast("已创建", "success", "相似项查找任务已创建完成。")
    }

    const openIllustsOfAuthor = (author: Author) => {
        router.routePush({routeName: "Illust", initializer: {authorName: author.name}})
    }

    const openBooksOfAuthor = (author: Author) => {
        router.routePush({routeName: "Book", initializer: {authorName: author.name}})
    }

    return {openCreateView, openDetailView, deleteItem, toggleFavorite, findSimilarOfAuthor, openIllustsOfAuthor, openBooksOfAuthor}
}

function useListThumbnailLoadingCache() {
    const exampleCount = 5

    const loadingCache: Record<number, string[]> = {}

    const fetch = useFetchHelper(client => (id: number) => client.illust.list({type: "COLLECTION", order: "-orderTime", limit: exampleCount, author: id}))

    const fetchThumbnailFiles = async (id: number) => {
        const res = await fetch(id)
        return res !== undefined ? res.result.map(i => i.filePath.sample) : []
    }

    const getThumbnailFiles = async (id: number) => {
        const cache = loadingCache[id]
        if(cache !== null && cache !== undefined) {
            return cache
        }
        const res = await fetchThumbnailFiles(id)
        loadingCache[id] = res
        return res
    }

    return {getThumbnailFiles, exampleCount}
}

export function useListThumbnail(authorId: Ref<number>) {
    const { thumbnailLoadingCache: { getThumbnailFiles, exampleCount } } = useAuthorContext()

    const thumbnailFiles = ref<string[]>([])

    watch(authorId, async authorId => {
        thumbnailFiles.value = await getThumbnailFiles(authorId)
    }, {immediate: true})

    return {thumbnailFiles, exampleCount}
}

export function useAuthorCreatePanel() {
    const router = useTabRoute()
    const message = useMessageBox()

    const form = ref(mapTemplateToCreateForm(null, "ARTIST"))

    const { submit } = useCreatingHelper({
        form,
        create: client => client.author.create,
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
                if(type === "site") {
                    message.showOkMessage("error", `选择的来源站点不存在。`, `错误项: ${id}`)
                }else if(type === "sourceTagType") {
                    message.showOkMessage("error", `选择的来源标签类型不存在。`, `错误项: ${id.join(", ")}`)
                }else{
                    message.showOkMessage("error", `选择的资源${type}不存在。`, `错误项: ${id}`)
                }
            }else{
                return e
            }
        },
        afterCreate(result) {
            router.routeReplace({routeName: "AuthorDetail", path: result.id})
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

    useInitializer(params => {if(params.createTemplate) form.value = mapTemplateToCreateForm(params.createTemplate, "ARTIST")})

    return {form, submit}
}

export function useAuthorDetailPanel() {
    const toast = useToast()
    const router = useTabRoute()
    const message = useMessageBox()

    const fetchFindSimilarTaskCreate = usePostFetchHelper(client => client.findSimilar.task.create)

    const path = usePath<number>()

    const { data, setData, deleteData } = useFetchEndpoint({
        path,
        get: client => client.author.get,
        update: client => client.author.update,
        delete: client => client.author.delete,
        eventFilter: c => event => (event.eventType === "entity/meta-tag/updated" || event.eventType === "entity/meta-tag/deleted") && event.metaType === "AUTHOR" && event.metaId === c.path,
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

    const setType = async (type: AuthorType) => {
        return type === data.value?.type || await setData({ type })
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

    const findSimilarOfAuthor = async () => {
        await fetchFindSimilarTaskCreate({selector: {type: "author", authorIds: [data.value!.id]}})
        toast.toast("已创建", "success", "相似项查找任务已创建完成。")
    }

    const openIllustsOfAuthor = () => {
        router.routePush({routeName: "Illust", initializer: {authorName: data.value!.name}})
    }

    const openBooksOfAuthor = () => {
        router.routePush({routeName: "Book", initializer: {authorName: data.value!.name}})
    }

    const openAuthorDetail = (authorId: number) => {
        router.routePush({routeName: "AuthorDetail", path: authorId})
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
        toggleFavorite, setName, setDescription, setKeywords, setScore, setType, setMappingSourceTags, 
        findSimilarOfAuthor, openIllustsOfAuthor, openBooksOfAuthor, openAuthorDetail, deleteItem
    }
}

interface AuthorCreateFormData extends AuthorUpdateFormData {
    favorite: boolean
}

interface AuthorUpdateFormData {
    name: string
    otherNames: string[]
    type: AuthorType
    keywords: string[]
    description: string
    score: number | null
    mappingSourceTags: MappingSourceTag[]
}

function mapTemplateToCreateForm(template: Partial<DetailAuthor> | null, defaultType: AuthorType): AuthorCreateFormData {
    return {
        name: template?.name ?? "",
        otherNames: template?.otherNames ?? [],
        type: template?.type ?? defaultType,
        description: template?.description ?? "",
        keywords: template?.keywords ?? [],
        favorite: template?.favorite ?? false,
        score: template?.score ?? null,
        mappingSourceTags: template?.mappingSourceTags ?? []
    }
}

function mapCreateFormToHelper(form: AuthorCreateFormData): AuthorCreateForm {
    return {
        name: form.name,
        otherNames: form.otherNames,
        type: form.type,
        description: form.description,
        keywords: form.keywords,
        favorite: form.favorite,
        score: form.score,
        mappingSourceTags: patchMappingSourceTagForm(form.mappingSourceTags, [])
    }
}

