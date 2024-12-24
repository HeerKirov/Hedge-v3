import { Ref } from "vue"
import { SetDataForm, SetDataFormSingle } from "@/components-module/data"
import { mapResponse, Response } from "@/functions/http-client"
import { ConflictingGroupMembersError, NotFound, ResourceNotExist, ResourceNotSuitable } from "@/functions/http-client/exceptions"
import { MetaUtilIdentity } from "@/functions/http-client/api/util-meta"
import { RelatedSimpleTopic } from "@/functions/http-client/api/topic"
import { RelatedSimpleAuthor } from "@/functions/http-client/api/author"
import { RelatedSimpleTag } from "@/functions/http-client/api/tag"
import { Tagme } from "@/functions/http-client/api/illust"
import { useFetchEndpoint, usePostFetchHelper } from "@/functions/fetch"
import { useToast } from "@/modules/toast"
import { useMessageBox } from "@/modules/message-box"
import { toRef } from "@/utils/reactivity"
import { Push } from "../context"

export interface MetaTagEditor {
    /**
     * 打开编辑模式的面板，编辑指定的对象。
     */
    editIdentity(identity: MetaUtilIdentity, onUpdated?: () => void): void
    /**
     * 打开面板，对指定的内容列表进行编辑，并返回编辑后的结果列表。如果取消编辑，则返回undefined。
     */
    editBatch(illustIds: number[], onUpdated?: () => void): void
}

export type MetaTagEditorProps = {
    mode: "identity"
    identity: MetaUtilIdentity
    onUpdated?(): void
} | {
    mode: "batch"
    identity: BatchIdentity
    updateMode?: "APPEND" | "OVERRIDE" | "REMOVE"
    onUpdated?(): void
}

export type BatchIdentity = {type: "ILLUST_LIST", illustIds: number[]}

export interface CommonData {
    tags: RelatedSimpleTag[]
    topics: RelatedSimpleTopic[]
    authors: RelatedSimpleAuthor[]
    tagme?: Tagme[]
}

type CommonException = NotFound | ResourceNotExist<"topics" | "authors" | "tags", number[]> | ResourceNotSuitable<"tags", number[]> | ConflictingGroupMembersError

export function useMetaTagEditor(push: Push): MetaTagEditor {
    return {
        editIdentity(identity, onUpdated) {
            push({
                type: "metaTagEditor",
                props: {mode: "identity", identity, onUpdated}
            })
        },
        editBatch(illustIds, onUpdated) {
            push({
                type: "metaTagEditor",
                props: {mode: "batch", identity: {type: "ILLUST_LIST", illustIds}, onUpdated}
            })
        }
    }
}

export function useMetaTagEditorData(props: Ref<MetaTagEditorProps>, updated: () => void) {
    const toast = useToast()
    const message = useMessageBox()
    const identity = toRef(props, "identity")

    if(props.value.mode === "identity") {
        const { data, setData } = useFetchEndpoint({
            path: identity as Ref<MetaUtilIdentity>,
            get: client => ({ type, id }): Promise<Response<CommonData, NotFound>> => {
                return type === "IMAGE" || type === "COLLECTION"
                    ? client.illust.get(id)
                    : client.book.get(id)
            },
            update: client => async ({ type, id }, form: SetDataFormSingle): Promise<Response<null, CommonException>> => {
                return type === "IMAGE" || type === "COLLECTION"
                    ? await client.illust.update(id, form)
                    : await client.book.update(id, form)
            },
            afterUpdate: updated
        })

        const setValue = async (form: SetDataForm): Promise<boolean> => {
            if(form.mode !== "SINGLE") {
                toast.handleError("内部错误", "对单模式的编辑器提供了一个非对单的表单。")
                return false
            }
            return await setData(form, e => {
                if(e.code === "NOT_EXIST") {
                    const [type, list] = e.info
                    const typeName = type === "tags" ? "标签" : type === "topics" ? "主题" : "作者"
                    message.showOkMessage("error", `选择的部分${typeName}不存在。`, `错误项: ${list}`)
                }else if(e.code === "NOT_SUITABLE") {
                    message.showOkMessage("prompt", "选择的部分标签不适用。", "请参阅下方的约束提示修改内容。")
                }else if(e.code === "CONFLICTING_GROUP_MEMBERS") {
                    message.showOkMessage("prompt", "选择的部分标签存在强制组冲突。", "请参阅下方的约束提示修改内容。")
                }else{
                    return e
                }
            })
        }

        return {data, identity, setValue}
    }else if(props.value.mode === "batch") {
        const target = props.value.identity.illustIds
        const { data } = useFetchEndpoint({
            path: identity as Ref<BatchIdentity>,
            get: client => async ({ illustIds }) => mapResponse(await client.illust.summaryByIds(illustIds), r => ({tags: r.tags, topics: r.topics, authors: r.authors, tagme: r.tagme})),
        })

        const fetch = usePostFetchHelper({
            request: client => client.illust.batchUpdate,
            handleErrorInRequest(e) {
                if(e.code === "NOT_EXIST") {
                    const [type, list] = e.info
                    const typeName = type === "tags" ? "标签" : type === "topics" ? "主题" : type === "authors" ? "作者" : "图库项目"
                    message.showOkMessage("error", `选择的部分${typeName}不存在。`, `错误项: ${list}`)
                }else if(e.code === "NOT_SUITABLE") {
                    const [type, _] = e.info
                    if(type === "tags") message.showOkMessage("prompt", "选择的部分标签不适用。", "请参阅下方的约束提示修改内容。")
                    else if(type === "target") message.showOkMessage("prompt", "选择的部分图库项目不适用。", "不能同时编辑集合与它的子项。")
                }else if(e.code === "CONFLICTING_GROUP_MEMBERS") {
                    message.showOkMessage("prompt", "选择的部分标签存在强制组冲突。", "请参阅下方的约束提示修改内容。")
                }else{
                    return e
                }
            }
        })

        const setValue = async (form: SetDataForm): Promise<boolean> => {
            if(form.mode === "OVERWRITE") {
                const ok = await fetch({target, tags: form.tags, topics: form.topics, authors: form.authors, mappingSourceTags: form.mappings, tagUpdateMode: "OVERRIDE"})
                if(ok) updated()
                return ok
            }else if(form.mode === "BATCH") {
                if(form.removeTags.length || form.removeTopics.length || form.removeAuthors.length) {
                    const ok = await fetch({target, tags: form.removeTags, topics: form.removeTopics, authors: form.removeAuthors, tagUpdateMode: "REMOVE"})
                    if(!ok) return false
                }
                if(form.appendTags.length || form.appendAuthors.length || form.appendTopics.length || form.appendMappings.length) {
                    const ok = await fetch({target, tags: form.appendTags, topics: form.appendTopics, authors: form.appendAuthors, mappingSourceTags: form.appendMappings, tagUpdateMode: "APPEND"})
                    if(!ok) return false
                }
                updated()
                return true
            }else{
                toast.handleError("内部错误", "批量模式的编辑器提供了一个对单的表单。")
                return false
            }
        }

        return {data, identity, setValue}
    }else{
        throw new Error(`Unsupported props ${props.value}.`)
    }
}
