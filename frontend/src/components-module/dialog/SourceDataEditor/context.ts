import { ref, Ref, watch } from "vue"
import {
    SourceBook, SourceTag, SourceDataIdentity,
    SourceDataCreateForm, SourceDataUpdateForm, DetailSourceData
} from "@/functions/http-client/api/source-data"
import { useCreatingHelper, useFetchEndpoint } from "@/functions/fetch"
import { useMessageBox } from "@/modules/message-box"
import { patchSourceBookForm, patchSourceTagForm } from "@/utils/translation"
import { toRef } from "@/utils/reactivity"
import { objects } from "@/utils/primitives"
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

    const form = ref<SourceDataCreateFormData>({
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
        beforeCreate(form): boolean | void {
            if(form.identity.sourceSite === null || form.identity.sourceId === null) {
                message.showOkMessage("prompt", "站点与来源ID不能为空。")
                return false
            }
        },
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

export function useEditorData(identity: Ref<SourceDataIdentity>, completed: () => void) {
    const { data, setData } = useFetchEndpoint({
        path: identity,
        get: client => client.sourceData.get,
        update: client => client.sourceData.update
    })

    const form = ref<SourceDataUpdateFormData | null>(null)

    watch(data, data => {
        if(data !== null) {
            form.value = mapDataToUpdateForm(data)
        }
    })

    const save = async () => {
        if(form.value && data.value) {
            const updateForm: SourceDataUpdateForm = {
                title: form.value.title !== data.value.title ? form.value.title : undefined,
                description: form.value.description !== data.value.description ? form.value.description : undefined,
                tags: !objects.deepEquals(form.value.tags, data.value.tags) ? patchSourceTagForm(form.value.tags, data.value.tags) : undefined,
                books: !objects.deepEquals(form.value.books, data.value.books) ? patchSourceBookForm(form.value.books, data.value.books) : undefined,
                relations: !objects.deepEquals(form.value.relations, data.value.relations) ? form.value.relations : undefined
            }
            const r = !Object.values(form).filter(i => i !== undefined).length || await setData(updateForm)
            if(r && completed) completed()
        }
    }

    return {data, form, save}
}

interface SourceDataUpdateFormData {
    title: string,
    description: string,
    tags: SourceTag[],
    books: SourceBook[],
    relations: number[]
}

interface SourceDataCreateFormData {
    identity: {sourceSite: string | null, sourceId: number | null}
    data: SourceDataUpdateFormData
}

function mapDataToUpdateForm(data: DetailSourceData): SourceDataUpdateFormData {
    return {
        title: data.title,
        description: data.description,
        tags: data.tags,
        books: data.books,
        relations: data.relations
    }
}
