import { computed, ref, Ref } from "vue"
import { SourceBook, SourceDataCreateForm, SourceDataIdentity, SourceTag } from "@/functions/http-client/api/source-data"
import { useCreatingHelper, useFetchEndpoint } from "@/functions/fetch"
import { useMessageBox } from "@/modules/message-box"
import { patchSourceBookForm, patchSourceTagForm } from "@/utils/translation"
import { toRef } from "@/utils/reactivity"
import { Push } from "../context"

export interface SourceDataEditor {
    /**
     * 打开新建模式面板。
     */
    create(onCreated?: () => void): void
    /**
     * 打开编辑模式面板。
     */
    edit(identity: SourceDataIdentity, onUpdated?: () => void): void
}

export type SourceDataEditorProps = {
    mode: "create"
    onCreated?(): void
} | {
    mode: "edit"
    sourceSite: string
    sourceId: number
    onUpdated?(): void
}

export function useSourceDataEditor(push: Push): SourceDataEditor {
    return {
        create(onCreated) {
            push({
                type: "sourceDataEditor",
                props: {mode: "create", onCreated}
            })
        },
        edit(key, onUpdated) {
            push({
                type: "sourceDataEditor",
                props: {mode: "edit", ...key, onUpdated}
            })
        }
    }
}

export function useCreateData(completed: () => void) {
    const message = useMessageBox()

    const form = ref<{
        identity: {sourceSite: string | null, sourceId: number | null}
        data: {
            title: string,
            description: string,
            tags: SourceTag[],
            books: SourceBook[],
            relations: number[]
        }
    }>({
        identity: {sourceSite: null, sourceId: null},
        data: {
            title: "",
            description: "",
            tags: [],
            books: [],
            relations: []
        }
    })

    const { submit } = useCreatingHelper({
        form,
        mapForm(form): SourceDataCreateForm {
            return {
                sourceSite: form.identity.sourceSite!,
                sourceId: form.identity.sourceId!,
                title: form.data.title,
                description: form.data.description,
                tags: patchSourceTagForm(form.data.tags, []),
                books: patchSourceBookForm(form.data.books, []),
                relations: form.data.relations
            }
        },
        create: client => client.sourceData.create,
        afterCreate: completed,
        handleError(e) {
            if(e.code === "ALREADY_EXISTS") {
                message.showOkMessage("prompt", "该来源数据已存在。", "请尝试编辑此来源数据。")
            }else if(e.code === "NOT_EXIST") {
                message.showOkMessage("error", "选择的来源类型不存在。")
            }
        }
    })

    const identity = toRef(form, "identity")
    const data = toRef(form, "data")

    return {identity, data, submit}
}

export function useEditorData(identity: Ref<SourceDataIdentity>) {
    const { data, setData } = useFetchEndpoint({
        path: identity,
        get: client => client.sourceData.get,
        update: client => client.sourceData.update
    })

    const info = computed(() => data.value && ({sourceSiteName: data.value.sourceSiteName, sourceId: data.value.sourceId}))

    return {data, setData, info}
}
