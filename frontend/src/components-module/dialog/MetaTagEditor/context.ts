import { Ref, shallowRef } from "vue"
import { Response } from "@/functions/http-client"
import { ConflictingGroupMembersError, NotFound, ResourceNotExist, ResourceNotSuitable } from "@/functions/http-client/exceptions"
import { MetaUtilIdentity } from "@/functions/http-client/api/util-meta"
import { RelatedSimpleTopic } from "@/functions/http-client/api/topic"
import { RelatedSimpleAuthor } from "@/functions/http-client/api/author"
import { RelatedSimpleTag } from "@/functions/http-client/api/tag"
import { SourceTagPath } from "@/functions/http-client/api/all"
import { Tagme } from "@/functions/http-client/api/illust"
import { useFetchEndpoint, usePostFetchHelper } from "@/functions/fetch"
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
    editBatch(illustIds: number[], updateMode?: "APPEND" | "OVERRIDE" | "REMOVE", onUpdated?: () => void): void
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

export interface CommonForm {
    tags?: number[]
    topics?: number[]
    authors?: number[]
    mappings?: SourceTagPath[]
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
        editBatch(illustIds, updateMode, onUpdated) {
            push({
                type: "metaTagEditor",
                props: {mode: "batch", identity: {type: "ILLUST_LIST", illustIds}, updateMode, onUpdated}
            })
        }
    }
}

export function useMetaTagEditorData(props: Ref<MetaTagEditorProps>, updated: () => void) {
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
            update: client => async ({ type, id }, form: CommonForm): Promise<Response<null, CommonException>> => {
                return type === "IMAGE" || type === "COLLECTION"
                    ? await client.illust.update(id, form)
                    : await client.book.update(id, form)
            },
            afterUpdate: updated
        })

        const setValue = async (form: CommonForm): Promise<boolean> => {
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
        const tagUpdateMode = props.value.updateMode
        const data = shallowRef<CommonData | null>(null)

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

        const setValue = async (form: CommonForm): Promise<boolean> => {
            const ok = await fetch({target, tags: form.tags, topics: form.topics, authors: form.authors, mappingSourceTags: form.mappings, tagUpdateMode})
            if(ok) updated()
            return ok
        }

        return {data, identity, setValue}
    }else{
        throw new Error(`Unsupported props ${props.value}.`)
    }
}
