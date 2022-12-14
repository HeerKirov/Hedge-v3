import { computed, Ref, ref, shallowRef, watch } from "vue"
import { TagTree } from "@/components-module/data"
import { useCreatingHelper, useFetchEndpoint, useFetchHelper, useFetchReactive, useRetrieveHelper } from "@/functions/fetch"
import { DetailViewState, useDetailViewState } from "@/services/base/detail-view-state"
import { TagAddressType, TagCreateForm, TagGroupType, TagLink, TagTreeNode } from "@/functions/http-client/api/tag"
import { SimpleAnnotation } from "@/functions/http-client/api/annotations"
import { MappingSourceTag } from "@/functions/http-client/api/source-tag-mapping"
import { SimpleIllust } from "@/functions/http-client/api/illust"
import { useLocalStorage } from "@/functions/app"
import { useMessageBox } from "@/modules/message-box"
import { computedAsync, computedWatchMutable, installation } from "@/utils/reactivity"
import { patchMappingSourceTagForm } from "@/utils/translation"
import { checkTagName } from "@/utils/validation"
import { objects } from "@/utils/primitives"


export const [installTagContext, useTagContext] = installation(function () {
    const paneState = useDetailViewState<number, TagCreateTemplate>()

    const listview = useTagListView(paneState)

    const editableLockOn = useLocalStorage("tag/list/editable", false)

    const search = useTagSearch(listview.data)

    return {paneState, listview, editableLockOn, search}
})

interface TagCreateTemplate {
    parentId: number | null
    ordinal: number
}

function useTagListView(paneState: DetailViewState<number, TagCreateTemplate>) {
    const message = useMessageBox()

    const { loading, data, refresh } = useFetchReactive({
        get: client => () => client.tag.tree({}),
        eventFilter: e => (e.eventType === "entity/meta-tag/created" || e.eventType === "entity/meta-tag/updated" || e.eventType === "entity/meta-tag/deleted") && e.metaType === "TAG"
    })

    const helper = useRetrieveHelper({
        update: client => client.tag.update,
        delete: client => client.tag.delete,
        handleErrorInUpdate(e) {
            if(e.code === "RECURSIVE_PARENT") {
                message.showOkMessage("prompt", "???????????????????????????", "??????????????????????????????????????????")
            }else{
                return e
            }
        }
    })

    const createByOrdinal = (parentId: number | null, ordinal: number) => {
        paneState.createView({parentId, ordinal})
    }

    const moveItem = async (tagId: number, targetParentId: number | null | undefined, targetOrdinal: number) => {
        await helper.setData(tagId, {parentId: targetParentId, ordinal: targetOrdinal})
    }

    const deleteItem = async (tagId: number) => {
        if(await helper.deleteData(tagId)) {
            if(paneState.isDetailView(tagId)) {
                paneState.closeView()
            }
        }
    }

    return {loading, data, refresh, operators: {createByOrdinal, moveItem, deleteItem}}
}

function useTagSearch(data: Ref<TagTreeNode[] | undefined>) {
    const searchText = ref("")

    const searchInfo = ref<{total: number, current: number} | null>(null)

    const searchResult = shallowRef<TagTreeNode[] | null>(null)

    const tagTreeRef = ref<InstanceType<typeof TagTree>>()

    const jumpTo = (id: number) => {
        if(tagTreeRef.value) tagTreeRef.value.jumpTo(id)
    }

    const next = () => {
        if(searchResult.value?.length && searchInfo.value) {
            if(searchInfo.value.current < searchInfo.value.total - 1) {
                searchInfo.value.current += 1
            }else{
                searchInfo.value.current = 0
            }
            jumpTo(searchResult.value[searchInfo.value.current].id)
        }
    }

    const prev = () => {
        if(searchResult.value?.length && searchInfo.value) {
            if(searchInfo.value.current > 0) {
                searchInfo.value.current -= 1
            }else{
                searchInfo.value.current = searchInfo.value.total - 1
            }
            jumpTo(searchResult.value[searchInfo.value.current].id)
        }
    }

    watch(searchText, searchText => {
        const searchValue = searchText.trim().toLowerCase()
        if(searchValue) {
            const result: TagTreeNode[] = []

            function condition(node: TagTreeNode, text: string) {
                return node.name.toLowerCase().includes(text) || node.otherNames.some(n => n.toLowerCase().includes(text))
            }

            function searchInNodeList(nodes: TagTreeNode[]) {
                for(const node of nodes) {
                    if(condition(node, searchValue)) result.push(node)
                    if(node.children?.length) searchInNodeList(node.children)
                }
            }

            if(data.value?.length) searchInNodeList(data.value)

            searchResult.value = result
            searchInfo.value = {total: result.length, current: 0}

            if(result.length) jumpTo(result[0].id)
        }else{
            searchInfo.value = null
            searchResult.value = null
        }
    })

    return {searchText, searchInfo, tagTreeRef, next, prev}
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
                message.showOkMessage("prompt", "?????????????????????", "???????????????????????????????????? ` \" ' . | ?????????")
                return false
            }
            for(const otherName of form.otherNames) {
                if(!checkTagName(otherName)) {
                    message.showOkMessage("prompt", "?????????????????????", "?????????????????? ` \" ' . | ?????????")
                    return false
                }
            }
        },
        handleError(e) {
            if(e.code === "ALREADY_EXISTS") {
                message.showOkMessage("prompt", "?????????????????????")
            }else if(e.code === "NOT_EXIST") {
                const [type, ids] = e.info
                if(type === "parentId") {
                    message.showOkMessage("error", "?????????????????????????????????????????????", `?????????: ${ids}`)
                }else if(type === "links") {
                    message.showOkMessage("error", "??????????????????????????????????????????", `?????????: ${ids}`)
                }else if(type === "examples") {
                    message.showOkMessage("error", "??????????????????????????????", `?????????: ${ids}`)
                }else if(type === "annotations") {
                    message.showOkMessage("error", "???????????????????????????", `?????????: ${ids}`)
                }else{
                    message.showOkMessage("error", `???????????????${type}????????????`, `?????????: ${ids}`)
                }
            }else if(e.code === "CANNOT_GIVE_COLOR") {
                message.showOkMessage("prompt", "???????????????????????????????????????????????????????????????????????????")
            }else if(e.code === "NOT_SUITABLE") {
                const [type, ids] = e.info
                if(type === "examples") {
                    message.showOkMessage("error", "???????????????????????????", `????????????????????????????????????????????????????????????`)
                }else if(type === "annotations") {
                    const content = ids.map(id => form.value.annotations?.find(i => i.id === id)?.name ?? "unknown").join(", ")
                    message.showOkMessage("error", "???????????????????????????", `???????????????????????????????????????????????????????????????????????????: ${content}`)
                }else if(type === "links") {
                    const content = ids.map(id => form.value.links?.find(i => i.id === id)?.name ?? "unknown").join(", ")
                    message.showOkMessage("error", "??????????????????????????????????????????", `?????????????????????????????????????????????: ${content}`)
                }else{
                    message.showOkMessage("prompt", `???????????????${type}????????????`)
                }
            }else{
                return e
            }
        },
        afterCreate(result) {
            paneState.detailView(result.id)
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
        eventFilter: ({ path }) => event => (event.eventType === "entity/meta-tag/updated" || event.eventType === "entity/meta-tag/deleted") && event.metaType === "TAG" && event.metaId === path,
        afterRetrieve(path, data) {
            if(path !== null && data === null) {
                paneState.closeView()
            }
        }
    })

    const addressInfo = computed<{address: string | null, member: boolean, memberIndex: number | null}>(() => {
        if(data.value !== null && data.value.parents.length) {
            const address = data.value.parents.map(i => i.name).join(".")
            const parent = data.value.parents[data.value.parents.length - 1]
            const member = parent.group !== "NO"
            const memberIndex = parent.group === "SEQUENCE" || parent.group === "FORCE_AND_SEQUENCE" ? data.value.ordinal + 1 : null

            return {address, member, memberIndex}
        }else{
            return {address: null, member: false, memberIndex: null}
        }
    })

    const isRootNode = computed(() => data.value?.parentId == null)

    const setName = async ([name, otherNames, color]: [string, string[], string | null]) => {
        if(!checkTagName(name)) {
            message.showOkMessage("prompt", "?????????????????????", "???????????????????????????????????? ` \" ' . | ?????????")
            return false
        }
        if(otherNames.some(n => !checkTagName(n))) {
            message.showOkMessage("prompt", "?????????????????????", "???????????????????????????????????? ` \" ' . | ?????????")
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
                message.showOkMessage("prompt", "?????????????????????")
            } else if(e.code === "CANNOT_GIVE_COLOR") {
                message.showOkMessage("prompt", "???????????????????????????????????????????????????????????????????????????")
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
                    message.showOkMessage("error", "???????????????????????????", `?????????: ${ids}`)
                }
            }else if(e.code === "NOT_SUITABLE") {
                const [, ids] = e.info
                const content = ids.map(id => annotations.find(i => i.id === id)?.name ?? "unknown").join(", ")
                message.showOkMessage("error", "???????????????????????????", `???????????????????????????????????????????????????????????????????????????: ${content}`)
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
                    message.showOkMessage("error", "??????????????????????????????????????????", `?????????: ${ids}`)
                }
            }else if(e.code === "NOT_SUITABLE") {
                const [type, ids] = e.info
                if(type === "links") {
                    const content = ids.map(id => links.find(i => i.id === id)?.name ?? "unknown").join(", ")
                    message.showOkMessage("error", "??????????????????????????????????????????", `?????????????????????????????????????????????: ${content}`)
                }
            }else{
                return e
            }
        })
    }

    const setMappingSourceTags = async (mappingSourceTags: MappingSourceTag[]) => {
        //??????mapping source tags??????????????????????????????????????????????????????
        const final: MappingSourceTag[] = mappingSourceTags.filter(t => t.site && t.name && t.code)

        return objects.deepEquals(final, data.value?.mappingSourceTags) || await setData({
            mappingSourceTags: patchMappingSourceTagForm(mappingSourceTags, data.value?.mappingSourceTags ?? [])
        }, e => {
            if(e.code === "NOT_EXIST") {
                message.showOkMessage("error", "?????????????????????????????????")
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
                    message.showOkMessage("error", "??????????????????????????????????????????", `?????????: ${ids}`)
                }else{
                    return e
                }
            }else if(e.code === "NOT_SUITABLE") {
                const [type, ids] = e.info
                if(type === "examples") {
                    message.showOkMessage("error", "??????????????????????????????????????????", `??????????????????????????????????????????: ${ids}`)
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
    color: string | null,
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
