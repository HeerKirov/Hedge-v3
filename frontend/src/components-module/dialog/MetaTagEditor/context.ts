import { Ref } from "vue"
import { Response } from "@/functions/http-client"
import { ConflictingGroupMembersError, NotFound, ResourceNotExist, ResourceNotSuitable } from "@/functions/http-client/exceptions"
import { MetaUtilIdentity } from "@/functions/http-client/api/util-meta"
import { RelatedSimpleTopic } from "@/functions/http-client/api/topic"
import { RelatedSimpleAuthor } from "@/functions/http-client/api/author"
import { RelatedSimpleTag } from "@/functions/http-client/api/tag"
import { Tagme } from "@/functions/http-client/api/illust"
import { useFetchEndpoint } from "@/functions/fetch"
import { useMessageBox } from "@/modules/message-box"
import { Push } from "../context"

export interface MetaTagEditor {
    /**
     * 打开编辑模式的面板，编辑指定的对象。
     */
    editIdentity(identity: MetaUtilIdentity, onUpdated?: () => void): void
    /**
     * 打开面板，对指定的内容列表进行编辑，并返回编辑后的结果列表。如果取消编辑，则返回undefined。
     */
    edit(data: CommonData, options?: EditOptions): Promise<CommonData | undefined>
}

export type MetaTagEditorProps = {
    mode: "identity"
    identity: MetaUtilIdentity
    onUpdated?(): void
} | {
    mode: "custom"
    data: CommonData
    allowTagme?: boolean
    resolve(_: CommonData | undefined): void
    cancel(): void
}

interface EditOptions {
    allowTagme?: boolean
}

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
        edit(data: CommonData, options?: EditOptions): Promise<CommonData | undefined> {
            return new Promise<CommonData | undefined>(resolve => {
                push({
                    type: "metaTagEditor",
                    props: {mode: "custom", data, resolve, allowTagme: options?.allowTagme, cancel: () => resolve(undefined)}
                })
            })
        }
    }
}

export function useIdentityModeData(identity: Ref<MetaUtilIdentity>, updated: () => void) {
    const message = useMessageBox()

    const { data, setData } = useFetchEndpoint({
        path: identity,
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

    return {data, setValue}
}
