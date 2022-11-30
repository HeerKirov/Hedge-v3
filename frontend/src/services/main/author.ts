import { readonly, Ref, ref, watch } from "vue"
import { installVirtualViewNavigation } from "@/components/data"
import { useLocalStorage } from "@/functions/app"
import { useCreatingHelper, useFetchEndpoint, useRetrieveHelper, ErrorHandler } from "@/functions/fetch"
import { flatResponse } from "@/functions/http-client"
import {
    DetailAuthor,
    AuthorCreateForm, AuthorUpdateForm, AuthorExceptions,
    AuthorQueryFilter, AuthorType
} from "@/functions/http-client/api/author"
import { SimpleAnnotation } from "@/functions/http-client/api/annotations"
import { MappingSourceTag } from "@/functions/http-client/api/source-tag-mapping"
import { DetailViewState, useDetailViewState } from "@/services/base/navigation"
import { useNavHistoryPush } from "@/services/base/side-nav-menu"
import { useListViewContext } from "@/services/base/list-context"
import { usePopupMenu } from "@/modules/popup-menu"
import { useMessageBox } from "@/modules/message-box"
import { checkTagName } from "@/utils/validation"
import { patchMappingSourceTagForm } from "@/utils/translation"
import { computedWatchMutable, installation } from "@/utils/reactivity"
import { objects } from "@/utils/primitives"

export const [installAuthorContext, useAuthorContext] = installation(function () {
    const paneState = useDetailViewState<number, Partial<DetailAuthor>>()

    const listview = useListView(paneState)

    installVirtualViewNavigation()

    return {paneState, listview}
})

function useListView(paneState: DetailViewState<number, Partial<DetailAuthor>>) {
    const message = useMessageBox()

    const list = useListViewContext({
        defaultFilter: <AuthorQueryFilter>{order: "-updateTime"},
        request: client => (offset, limit, filter) => client.author.list({offset, limit, ...filter}),
        eventFilter: {
            filter: ["entity/meta-tag/created", "entity/meta-tag/updated", "entity/meta-tag/deleted"],
            operation({ event, refresh, update, remove }) {
                if(event.eventType === "entity/meta-tag/created" && event.metaType === "AUTHOR") {
                    refresh()
                }else if(event.eventType === "entity/meta-tag/updated" && event.metaType === "AUTHOR") {
                    update(i => i.id === event.metaId)
                }else if(event.eventType === "entity/meta-tag/deleted" && event.metaType === "AUTHOR") {
                    remove(i => i.id === event.metaId)
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.author.get(a.id))))
        }
    })

    const retrieveHelper = useRetrieveHelper({
        update: client => client.author.update,
        delete: client => client.author.delete
    })

    const createByTemplate = (id: number) => {
        const idx = list.listview.proxy.syncOperations.find(a => a.id === id)
        if(idx != undefined) {
            const author = list.listview.proxy.syncOperations.retrieve(idx)
            paneState.createView(author)
        }
    }

    const deleteItem = async (id: number) => {
        if(await message.showYesNoMessage("warn", "确定要删除此项吗？", "此操作不可撤回。")) {
            if(await retrieveHelper.deleteData(id)) {
                if(paneState.isDetailView(id)) paneState.closeView()
            }
        }
    }

    const toggleFavorite = async (authorId: number, favorite: boolean) => {
        await retrieveHelper.setData(authorId, {favorite})
    }

    const popupMenu = usePopupMenu<number>([
        {type: "normal", label: "查看详情", click: paneState.detailView},
        {type: "separator"},
        {type: "normal", label: "以此为模板新建", click: createByTemplate},
        {type: "separator"},
        {type: "normal", label: "删除此作者", click: deleteItem},
    ])

    return {...list, popupMenu, toggleFavorite}
}

export function useAuthorCreatePanel() {
    const message = useMessageBox()
    const { paneState } = useAuthorContext()
    const cacheStorage = useLocalStorage<{cacheType: AuthorType}>("author/create-panel", {cacheType: "ARTIST"})

    const form = computedWatchMutable(paneState.createTemplate, () => mapTemplateToCreateForm(paneState.createTemplate.value, cacheStorage.value.cacheType))

    const setProperty = <T extends keyof AuthorCreateFormData>(key: T, value: AuthorCreateFormData[T]) => {
        form.value[key] = value
    }

    const { submit } = useCreatingHelper({
        form,
        create: client => client.author.create,
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
            paneState.detailView(result.id)
        }
    })

    watch(() => form.value.type, authorType => {
        if(authorType !== cacheStorage.value.cacheType) {
            cacheStorage.value.cacheType = authorType
        }
    })

    return {form, setProperty, submit}
}

export function useAuthorDetailPanel() {
    const message = useMessageBox()
    const { paneState } = useAuthorContext()

    const { data, setData, deleteData } = useFetchEndpoint({
        path: paneState.detailPath,
        get: client => client.author.get,
        update: client => client.author.update,
        delete: client => client.author.delete,
        eventFilter: ({ path }) => event => (event.eventType === "entity/meta-tag/updated" || event.eventType === "entity/meta-tag/deleted") && event.metaType === "AUTHOR" && event.metaId === path,
        afterRetrieve(path, data) {
            if(path !== null && data === null) {
                paneState.closeView()
            }
        }
    })

    const editor = useAuthorDetailPanelEditor(data, setData)

    const toggleFavorite = async () => {
        if(data.value !== null) {
            await setData({favorite: !data.value.favorite})
        }
    }

    const createByTemplate = () => {
        if(data.value !== null) {
            paneState.createView(data.value)
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

    return {data, editor, operators: {toggleFavorite, createByTemplate, deleteItem}}
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

    return {editMode: readonly(editMode), form, setProperty, edit, save}
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
