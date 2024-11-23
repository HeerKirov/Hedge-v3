import { readonly, Ref, ref, watch } from "vue"
import { useLocalStorage } from "@/functions/app"
import { ErrorHandler, QueryListview, useCreatingHelper, useFetchEndpoint, useFetchHelper, usePostFetchHelper, useRetrieveHelper } from "@/functions/fetch"
import { flatResponse, mapResponse } from "@/functions/http-client"
import { Author, DetailAuthor, AuthorCreateForm, AuthorUpdateForm, AuthorExceptions, AuthorQueryFilter, AuthorType } from "@/functions/http-client/api/author"
import { SimpleAnnotation } from "@/functions/http-client/api/annotations"
import { MappingSourceTag } from "@/functions/http-client/api/source-tag-mapping"
import { useNavigationItem } from "@/services/base/side-nav-records"
import { useListViewContext } from "@/services/base/list-view-context"
import { useMessageBox } from "@/modules/message-box"
import { useToast } from "@/modules/toast"
import { useInitializer, usePath, useTabRoute, useDocumentTitle } from "@/modules/browser"
import { checkTagName } from "@/utils/validation"
import { patchMappingSourceTagForm } from "@/utils/translation"
import { installation } from "@/utils/reactivity"
import { objects } from "@/utils/primitives"

export const [installAuthorContext, useAuthorContext] = installation(function () {
    const listview = useListView()

    const operators = useOperators(listview.listview)

    const thumbnailLoadingCache = useListThumbnailLoadingCache()

    return {listview, operators, thumbnailLoadingCache}
})

function useListView() {
    return useListViewContext({
        defaultFilter: <AuthorQueryFilter>{order: "-updateTime"},
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

    const createByTemplate = (author: Author) => {
        listview.proxy.findByKey(author.id).then(idx => {
            if(idx != undefined) {
                const author = listview.proxy.sync.retrieve(idx)
                router.routePush({routeName: "AuthorCreate", initializer: {createTemplate: author}})
            }
        })
    }

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

    return {openCreateView, openDetailView, createByTemplate, deleteItem, toggleFavorite, findSimilarOfAuthor, openIllustsOfAuthor}
}

function useListThumbnailLoadingCache() {
    const loadingCache: Record<number, string[]> = {}

    const fetch = useFetchHelper(client => (id: number) => client.illust.list({type: "COLLECTION", order: "-orderTime", limit: 3, author: id}))

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

    return {getThumbnailFiles}
}

export function useListThumbnail(authorId: Ref<number>) {
    const { thumbnailLoadingCache: { getThumbnailFiles } } = useAuthorContext()

    const thumbnailFiles = ref<string[]>([])

    watch(authorId, async authorId => {
        thumbnailFiles.value = await getThumbnailFiles(authorId)
    }, {immediate: true})

    return {thumbnailFiles}
}

export function useAuthorCreatePanel() {
    const router = useTabRoute()
    const message = useMessageBox()
    const cacheStorage = useLocalStorage<{cacheType: AuthorType}>("author/create-panel", {cacheType: "ARTIST"})

    const form = ref(mapTemplateToCreateForm(null, cacheStorage.value.cacheType))

    const setProperty = <T extends keyof AuthorCreateFormData>(key: T, value: AuthorCreateFormData[T]) => {
        form.value[key] = value
    }

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
                if(type === "annotations") {
                    message.showOkMessage("error", "选择的注解不存在。", `错误项: ${id}`)
                }else if(type === "site") {
                    message.showOkMessage("error", `选择的来源站点不存在。`, `错误项: ${id}`)
                }else if(type === "sourceTagType") {
                    message.showOkMessage("error", `选择的来源标签类型不存在。`, `错误项: ${id.join(", ")}`)
                }else{
                    message.showOkMessage("error", `选择的资源${type}不存在。`, `错误项: ${id}`)
                }
            }else if(e.code === "NOT_SUITABLE") {
                const [, ids] = e.info
                const content = ids.map(id => form.value.annotations?.find(i => i.id === id)?.name ?? "unknown").join(", ")
                message.showOkMessage("error", "选择的注解不可用。", `选择的注解的导出目标设置使其无法导出至当前作者类型。错误项: ${content}`)
            }else{
                return e
            }
        },
        afterCreate(result) {
            router.routeReplace({routeName: "AuthorDetail", path: result.id})
        }
    })

    watch(() => form.value.type, authorType => {
        if(authorType !== cacheStorage.value.cacheType) {
            cacheStorage.value.cacheType = authorType
        }
    })

    useInitializer(params => {if(params.createTemplate) form.value = mapTemplateToCreateForm(params.createTemplate, cacheStorage.value.cacheType)})

    return {form, setProperty, submit}
}

export function useAuthorDetailPanel() {
    const router = useTabRoute()
    const message = useMessageBox()

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

    const { data: exampleData } = useFetchEndpoint({
        path,
        get: client => async (author: number) => mapResponse(await client.illust.list({limit: 10, author, type: "COLLECTION", order: "-orderTime"}), r => r.result)
    })

    const editor = useAuthorDetailPanelEditor(data, setData)

    const toggleFavorite = async () => {
        if(data.value !== null) {
            await setData({favorite: !data.value.favorite})
        }
    }

    const createByTemplate = () => {
        if(data.value !== null) {
            router.routePush({routeName: "AuthorCreate", initializer: {createTemplate: data.value}})
        }
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

    return {data, exampleData, editor, operators: {toggleFavorite, createByTemplate, openAuthorDetail, deleteItem}}
}

function useAuthorDetailPanelEditor(data: Readonly<Ref<DetailAuthor | null>>, setData: (form: AuthorUpdateForm, handle: ErrorHandler<AuthorExceptions["update"]>) => Promise<boolean>) {
    const message = useMessageBox()

    const editMode = ref(false)

    const form = ref<AuthorUpdateFormData | null>(null)

    const setProperty = <T extends keyof AuthorUpdateFormData>(key: T, value: AuthorUpdateFormData[T]) => {
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
            const updateForm: AuthorUpdateForm = {
                type: form.value.type !== data.value.type ? form.value.type : undefined,
                annotations: !objects.deepEquals(form.value.annotations.map(i => i.id), data.value.annotations.map(i => i.id)) ? form.value.annotations.map(i => i.id) : undefined,
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
                    if(type === "annotations") {
                        message.showOkMessage("error", "选择的注解不存在。", `错误项: ${id}`)
                    }else if(type === "site") {
                        message.showOkMessage("error", `选择的来源站点不存在。`, `错误项: ${id}`)
                    }else if(type === "sourceTagType") {
                        message.showOkMessage("error", `选择的来源标签类型不存在。`, `错误项: ${id.join(", ")}`)
                    }else{
                        message.showOkMessage("error", `选择的资源${type}不存在。`, `错误项: ${id}`)
                    }
                }else if(e.code === "NOT_SUITABLE") {
                    const [, id] = e.info
                    const content = id.map(id => form.value?.annotations?.find(i => i.id === id)?.name ?? "unknown").join(", ")

                    message.showOkMessage("error", "选择的注解不可用。", `选择的注解的导出目标设置使其无法导出至当前作者类型。错误项: ${content}`)
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

interface AuthorCreateFormData extends AuthorUpdateFormData {
    favorite: boolean
}

interface AuthorUpdateFormData {
    name: string
    otherNames: string[]
    type: AuthorType
    annotations: SimpleAnnotation[]
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
        annotations: template?.annotations ?? [],
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
        annotations: form.annotations.map(a => a.id),
        score: form.score,
        mappingSourceTags: patchMappingSourceTagForm(form.mappingSourceTags, [])
    }
}

function mapDataToUpdateForm(data: DetailAuthor): AuthorUpdateFormData {
    return {
        name: data.name,
        otherNames: data.otherNames,
        type: data.type,
        description: data.description,
        keywords: data.keywords,
        annotations: data.annotations,
        score: data.score,
        mappingSourceTags: data.mappingSourceTags
    }
}
