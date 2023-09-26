import { computed, watch } from "vue"
import { useCreatingHelper, useFetchEndpoint, useFetchHelper, useFetchReactive, useRetrieveHelper } from "@/functions/fetch"
import { DetailViewState, useRouterViewState } from "@/services/base/detail-view-state"
import { TagAddressType, TagCreateForm, TagGroupType, TagLink } from "@/functions/http-client/api/tag"
import { SimpleAnnotation } from "@/functions/http-client/api/annotations"
import { MappingSourceTag } from "@/functions/http-client/api/source-tag-mapping"
import { SimpleIllust } from "@/functions/http-client/api/illust"
import { useLocalStorage } from "@/functions/app"
import { useMessageBox } from "@/modules/message-box"
import { useRouterQueryNumber } from "@/modules/router"
import { UsefulColors } from "@/constants/ui"
import { useTagTreeSearch } from "@/services/common/tag"
import { computedAsync, computedWatchMutable, installation } from "@/utils/reactivity"
import { patchMappingSourceTagForm } from "@/utils/translation"
import { checkTagName } from "@/utils/validation"
import { objects } from "@/utils/primitives"

export const [installTagContext, useTagContext] = installation(function () {
    const paneState = useRouterViewState<number, TagCreateTemplate>(useRouterQueryNumber("MainTag", "detail"))

    const listview = useTagListView()

    const operators = useOperators(paneState)

    const editableLockOn = useLocalStorage("tag/list/editable", false)

    const search = useTagTreeSearch(listview.data)

    return {paneState, listview, operators, editableLockOn, search}
})

interface TagCreateTemplate {
    parentId: number | null
    ordinal: number
}

function useTagListView() {
    const { loading, data, refresh } = useFetchReactive({
        get: client => () => client.tag.tree({}),
        eventFilter: e => (e.eventType === "entity/meta-tag/created" || e.eventType === "entity/meta-tag/updated" || e.eventType === "entity/meta-tag/deleted") && e.metaType === "TAG"
    })

    return {loading, data, refresh}
}

function useOperators(paneState: DetailViewState<number, TagCreateTemplate>) {
    const message = useMessageBox()

    const helper = useRetrieveHelper({
        update: client => client.tag.update,
        delete: client => client.tag.delete,
        handleErrorInUpdate(e) {
            if(e.code === "RECURSIVE_PARENT") {
                message.showOkMessage("prompt", "无法移动到此位置。", "无法将标签移动到其子标签下。")
            }else{
                return e
            }
        }
    })

    const createByOrdinal = (parentId: number | null, ordinal: number) => {
        paneState.openCreateView({parentId, ordinal})
    }

    const moveItem = async (tagId: number, targetParentId: number | null | undefined, targetOrdinal: number) => {
        await helper.setData(tagId, {parentId: targetParentId, ordinal: targetOrdinal})
    }

    const deleteItem = async (tagId: number) => {
        if(await helper.deleteData(tagId)) {
            if(paneState.detailPath.value === tagId) {
                paneState.closeView()
            }
        }
    }

    return {createByOrdinal, moveItem, deleteItem}
}

export function useTagCreatePane() {
    const message = useMessageBox()
    const { paneState } = useTagContext()
    const cacheStorage = useLocalStorage<{cacheAddressType: TagAddressType}>("tag/create-pane", {cacheAddressType: "TAG"})

    const form = computedWatchMutable(paneState.createTemplate, () => mapTemplateToCreateForm(paneState.createTemplate.value, cacheStorage.value.cacheAddressType))

    const { submit } = useCreatingHelper({
        form,
        create: client => client.tag.create,
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
                const [type, ids] = e.info
                if(type === "parentId") {
                    message.showOkMessage("error", "选择的作为父标签的标签不存在。", `错误项: ${ids}`)
                }else if(type === "links") {
                    message.showOkMessage("error", "选择的作为链接的标签不存在。", `错误项: ${ids}`)
                }else if(type === "examples") {
                    message.showOkMessage("error", "选择的示例项不存在。", `错误项: ${ids}`)
                }else if(type === "annotations") {
                    message.showOkMessage("error", "选择的注解不存在。", `错误项: ${ids}`)
                }else if(type === "site") {
                    message.showOkMessage("error", `选择的来源站点不存在。`, `错误项: ${ids}`)
                }else if(type === "sourceTagType") {
                    message.showOkMessage("error", `选择的来源标签类型不存在。`, `错误项: ${ids.join(", ")}`)
                }else{
                    message.showOkMessage("error", `选择的资源${type}不存在。`, `错误项: ${ids}`)
                }
            }else if(e.code === "CANNOT_GIVE_COLOR") {
                message.showOkMessage("prompt", "不能设置非根节点的颜色。它们的颜色始终跟随根节点。")
            }else if(e.code === "NOT_SUITABLE") {
                const [type, ids] = e.info
                if(type === "examples") {
                    message.showOkMessage("error", "选择的示例不可用。", `只能选择图像而非集合类型的项目作为示例。`)
                }else if(type === "annotations") {
                    const content = ids.map(id => form.value.annotations?.find(i => i.id === id)?.name ?? "unknown").join(", ")
                    message.showOkMessage("error", "选择的注解不可用。", `选择的注解的导出目标设置使其无法导出至标签。错误项: ${content}`)
                }else if(type === "links") {
                    const content = ids.map(id => form.value.links?.find(i => i.id === id)?.name ?? "unknown").join(", ")
                    message.showOkMessage("error", "选择的作为链接的标签不可用。", `虚拟地址段不能用作链接。错误项: ${content}`)
                }else{
                    message.showOkMessage("prompt", `指定的资源${type}不适用。`)
                }
            }else{
                return e
            }
        },
        afterCreate(result) {
            paneState.openDetailView(result.id)
        }
    })

    const fetch = useFetchHelper(client => client.tag.get)

    const addressInfo = computedAsync<{address: string | null, member: boolean, memberIndex: number | null}>({address: null, member: false, memberIndex: null}, async () => {
        if(form.value !== null && form.value.parentId !== null) {
            const parent = await fetch(form.value.parentId)
            if(parent !== undefined) {
                const address = parent.parents.map(t => t.name).concat(parent.name).join(".")
                const member = parent.group !== "NO"
                const memberIndex = parent.group === "SEQUENCE" ? (form.value.ordinal ?? 0) + 1 : null
                return {address, member, memberIndex}
            }
        }
        return {address: null, member: false, memberIndex: null}
    })

    const isRootNode = computed(() => form.value?.parentId == null)

    watch(() => form.value.type, addressType => {
        if(addressType !== cacheStorage.value.cacheAddressType) {
            cacheStorage.value.cacheAddressType = addressType
        }
    })

    return {form, submit, addressInfo, isRootNode}
}

export function useTagDetailPane() {
    const message = useMessageBox()
    const { paneState } = useTagContext()

    const { data, setData } = useFetchEndpoint({
        path: paneState.detailPath,
        get: client => client.tag.get,
        update: client => client.tag.update,
        delete: client => client.tag.delete,
        eventFilter: c => event => (event.eventType === "entity/meta-tag/updated" || event.eventType === "entity/meta-tag/deleted") && event.metaType === "TAG" && event.metaId === c.path,
        afterRetrieve(path, data) {
            if(path !== null && data === null) {
                paneState.closeView()
            }
        }
    })

    const addressInfo = computed<{address: string | null, member: boolean, memberIndex: number | undefined}>(() => {
        if(data.value !== null && data.value.parents.length) {
            const address = data.value.parents.map(i => i.name).join(".")
            const parent = data.value.parents[data.value.parents.length - 1]
            const member = parent.group !== "NO"
            const memberIndex = parent.group === "SEQUENCE" || parent.group === "FORCE_AND_SEQUENCE" ? data.value.ordinal + 1 : undefined

            return {address, member, memberIndex}
        }else{
            return {address: null, member: false, memberIndex: undefined}
        }
    })

    const isRootNode = computed(() => data.value?.parentId == null)

    const setName = async ([name, otherNames, color]: [string, string[], UsefulColors | null]) => {
        if(!checkTagName(name)) {
            message.showOkMessage("prompt", "不合法的名称。", "名称不能为空，且不能包含 ` \" ' . | 字符。")
            return false
        }
        if(otherNames.some(n => !checkTagName(n))) {
            message.showOkMessage("prompt", "不合法的别名。", "别名不能为空，且不能包含 ` \" ' . | 字符。")
            return false
        }

        const nameNotChanged = name === data.value?.name
        const otherNamesNotChanged = objects.deepEquals(otherNames, data.value?.otherNames)
        const colorNotChanged = color === data.value?.color

        return (nameNotChanged && otherNamesNotChanged && colorNotChanged) || await setData({
            name: nameNotChanged ? undefined : name,
            otherNames: otherNamesNotChanged ? undefined : otherNames,
            color: colorNotChanged ? undefined : (color ?? undefined)
        }, e => {
            if (e.code === "ALREADY_EXISTS") {
                message.showOkMessage("prompt", "该名称已存在。")
            } else if(e.code === "CANNOT_GIVE_COLOR") {
                message.showOkMessage("prompt", "不能设置非根节点的颜色。它们的颜色始终跟随根节点。")
            } else {
                return e
            }
        })
    }

    const setAnnotations = async (annotations: SimpleAnnotation[]) => {
        return objects.deepEquals(annotations, data.value?.annotations) || await setData({ annotations: annotations.map(a => a.id) }, e => {
            if(e.code === "NOT_EXIST") {
                const [type, ids] = e.info
                if(type === "annotations") {
                    message.showOkMessage("error", "选择的注解不存在。", `错误项: ${ids}`)
                }
            }else if(e.code === "NOT_SUITABLE") {
                const [, ids] = e.info
                const content = ids.map(id => annotations.find(i => i.id === id)?.name ?? "unknown").join(", ")
                message.showOkMessage("error", "选择的注解不可用。", `选择的注解的导出目标设置使其无法导出至标签。错误项: ${content}`)
            }else{
                return e
            }
        })
    }

    const setDescription = async (description: string) => {
        return description === data.value?.description || await setData({ description })
    }

    const setType = async (type: TagAddressType) => {
        return type === data.value?.type || await setData({ type })
    }

    const setGroup = async (group: TagGroupType) => {
        return group === data.value?.group || await setData({ group })
    }

    const setLinks = async (links: TagLink[]) => {
        return objects.deepEquals(links, data.value?.links) || await setData({ links: links.map(i => i.id) }, e => {
            if(e.code === "NOT_EXIST") {
                const [type, ids] = e.info
                if(type === "links") {
                    message.showOkMessage("error", "选择的作为链接的标签不存在。", `错误项: ${ids}`)
                }
            }else if(e.code === "NOT_SUITABLE") {
                const [type, ids] = e.info
                if(type === "links") {
                    const content = ids.map(id => links.find(i => i.id === id)?.name ?? "unknown").join(", ")
                    message.showOkMessage("error", "选择的作为链接的标签不可用。", `虚拟地址段不能用作链接。错误项: ${content}`)
                }
            }else{
                return e
            }
        })
    }

    const setMappingSourceTags = async (mappingSourceTags: MappingSourceTag[]) => {
        //由于mapping source tags的编辑模式，需要在提交之前做一次过滤
        const final: MappingSourceTag[] = mappingSourceTags.filter(t => t.site && t.name && t.code)

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

    const setExamples = async (examples: SimpleIllust[]) => {
        return objects.deepEquals(examples, data.value?.examples) || await setData({ examples: examples.map(i => i.id) }, e => {
            if(e.code === "NOT_EXIST") {
                const [type, ids] = e.info
                if(type === "examples") {
                    message.showOkMessage("error", "选择的作为示例的图像不存在。", `错误项: ${ids}`)
                }else{
                    return e
                }
            }else if(e.code === "NOT_SUITABLE") {
                const [type, ids] = e.info
                if(type === "examples") {
                    message.showOkMessage("error", "选择的作为示例的图像不可用。", `图库集合不能用作示例。错误项: ${ids}`)
                }else{
                    return e
                }
            }else{
                return e
            }
        })
    }

    return {data, addressInfo, isRootNode, setName, setAnnotations, setDescription, setType, setGroup, setLinks, setMappingSourceTags, setExamples}
}

interface TagCreateFormData {
    parentId: number | null,
    ordinal: number | null,
    name: string
    otherNames: string[],
    color: UsefulColors | null,
    type: TagAddressType
    group: TagGroupType,
    description: string,
    annotations: SimpleAnnotation[],
    links: TagLink[],
    mappingSourceTags: MappingSourceTag[],
    examples: SimpleIllust[]
}

function mapTemplateToCreateForm(template: TagCreateTemplate | null, defaultAddressType: TagAddressType): TagCreateFormData {
    return {
        name: "",
        parentId: template?.parentId ?? null,
        ordinal: template?.ordinal ?? null,
        type: defaultAddressType,
        otherNames: [],
        group: "NO",
        links: [],
        annotations: [],
        description: "",
        color: null,
        mappingSourceTags: [],
        examples: []
    }
}

function mapCreateFormToHelper(form: TagCreateFormData): TagCreateForm {
    return {
        name: form.name,
        parentId: form.parentId,
        ordinal: form.ordinal,
        type: form.type,
        otherNames: form.otherNames,
        group: form.group,
        links: form.links.map(i => i.id),
        annotations: form.annotations.map(a => a.id),
        description: form.description,
        color: form.color,
        mappingSourceTags: patchMappingSourceTagForm(form.mappingSourceTags.filter(t => t.site && t.name && t.code), []),
        examples: form.examples.map(e => e.id)
    }
}
