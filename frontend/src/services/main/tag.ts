import { useFetchEndpoint, useFetchReactive, useRetrieveHelper } from "@/functions/fetch"
import { useMessageBox } from "@/modules/message-box"
import { DetailViewState, useDetailViewState } from "@/services/base/navigation"
import { TagAddressType, TagGroupType, TagLink, TagTreeNode } from "@/functions/http-client/api/tag"
import { SimpleAnnotation } from "@/functions/http-client/api/annotations"
import { MappingSourceTag } from "@/functions/http-client/api/source-tag-mapping"
import { SimpleIllust } from "@/functions/http-client/api/illust"
import { patchMappingSourceTagForm } from "@/utils/translation"
import { checkTagName } from "@/utils/validation"
import { installation } from "@/utils/reactivity"
import { objects } from "@/utils/primitives"
import { computed } from "vue";


export const [installTagContext, useTagContext] = installation(function () {
    const paneState = useDetailViewState<number, TagCreateTemplate>()

    const listview = useTagListView(paneState)

    return {paneState, listview}
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
        delete: client => client.tag.delete
    })

    const tagTreeEvents = {
        onClick(tag: TagTreeNode, _: number | null, __: number) {
            paneState.detailView(tag.id)
        },
        async onDelete(tag: TagTreeNode, _: number | null, __: number) {
            if(await helper.deleteData(tag.id)) {
                if(paneState.isDetailView(tag.id)) {
                    paneState.closeView()
                }
            }
        },
        onCreate(parentId: number | null, ordinal: number) {
            paneState.createView({parentId, ordinal})
        }
    }

    return {loading, data, refresh, tagTreeEvents}
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
            const memberIndex = parent.group === "SEQUENCE" ? data.value.ordinal + 1 : null

            return {address, member, memberIndex}
        }else{
            return {address: null, member: false, memberIndex: null}
        }
    })

    const isRootNode = computed(() => data.value?.parentId == null)

    const setName = async ([name, otherNames, color]: [string, string[], string | null]) => {
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
        return objects.deepEquals(mappingSourceTags, data.value?.mappingSourceTags) || await setData({
            mappingSourceTags: patchMappingSourceTagForm(mappingSourceTags, data.value?.mappingSourceTags ?? [])
        }, e => {
            if(e.code === "NOT_EXIST") {
                message.showOkMessage("error", "选择的来源类型不存在。")
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
