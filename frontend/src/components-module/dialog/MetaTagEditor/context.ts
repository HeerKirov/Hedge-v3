import { ConflictingGroupMembersError, NotFound, ResourceNotExist, ResourceNotSuitable } from "@/functions/http-client/exceptions"
import { MetaUtilIdentity } from "@/functions/http-client/api/util-meta"
import { RelatedSimpleTopic } from "@/functions/http-client/api/topic"
import { RelatedSimpleAuthor } from "@/functions/http-client/api/author"
import { RelatedSimpleTag } from "@/functions/http-client/api/tag"
import { Tagme } from "@/functions/http-client/api/illust"
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
    allowEditTagme?: boolean
    resolve(_: CommonData | undefined): void
    cancel(): void
}

interface EditOptions {
    allowEditTagme?: boolean
}

interface CommonData {
    tags: RelatedSimpleTag[]
    topics: RelatedSimpleTopic[]
    authors: RelatedSimpleAuthor[]
    tagme?: Tagme[]
}

interface CommonForm {
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
                    props: {mode: "custom", data, resolve, allowEditTagme: options?.allowEditTagme, cancel: () => resolve(undefined)}
                })
            })
        }
    }
}
