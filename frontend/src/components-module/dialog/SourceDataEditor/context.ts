import { ref, Ref, watch } from "vue"
import {
    SourceBook, SourceTag, SourceDataIdentity,
    SourceDataCreateForm, SourceDataUpdateForm, DetailSourceData, SourceAdditionalInfo
} from "@/functions/http-client/api/source-data"
import { useCreatingHelper, useFetchEndpoint } from "@/functions/fetch"
import { useMessageBox } from "@/modules/message-box"
import { useSettingSite } from "@/services/setting"
import { patchSourceBookForm, patchSourceTagForm } from "@/utils/translation"
import { toRef } from "@/utils/reactivity"
import { objects } from "@/utils/primitives"
import { Push } from "../context"
import { LocalDateTime } from "@/utils/datetime";

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
    sourceId: string
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

    useSettingSite()

    const form = ref<SourceDataCreateFormData>({
        identity: {sourceSite: null, sourceId: null},
        data: {
            title: "",
            description: "",
            tags: [],
            books: [],
            relations: [],
            additionalInfo: [],
            publishTime: null,
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
                relations: form.data.relations,
                additionalInfo: form.data.additionalInfo,
                publishTime: form.data.publishTime
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
                const typeName = {"site": "来源站点", "additionalInfo": "附加信息字段", "sourceTagType": "标签类型"}[e.info[0]]
                message.showOkMessage("error", `选择的${typeName}不存在。`)
            }
        }
    })

    const identity = toRef(form, "identity")
    const data = toRef(form, "data")

    return {identity, data, submit}
}

export function useEditorData(identity: Ref<SourceDataIdentity>, completed: () => void) {
    const message = useMessageBox()

    useSettingSite()

    const { data, setData } = useFetchEndpoint({
        path: identity,
        get: client => client.sourceData.get,
        update: client => client.sourceData.update,
        handleErrorInUpdate(e) {
            if(e.code === "NOT_EXIST") {
                const typeName = {"site": "来源站点", "additionalInfo": "附加信息字段", "sourceTagType": "标签类型"}[e.info[0]]
                message.showOkMessage("error", `选择的${typeName}不存在。`)
            }
        }
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
                relations: !objects.deepEquals(form.value.relations, data.value.relations) ? form.value.relations : undefined,
                additionalInfo: !objects.deepEquals(form.value.additionalInfo, data.value.additionalInfo) ? form.value.additionalInfo : undefined,
                publishTime: !objects.deepEquals(form.value.publishTime, data.value.publishTime) ? form.value.publishTime : undefined
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
    relations: string[],
    additionalInfo: SourceAdditionalInfo[]
    publishTime: LocalDateTime | null
}

interface SourceDataCreateFormData {
    identity: {sourceSite: string | null, sourceId: string | null}
    data: SourceDataUpdateFormData
}

function mapDataToUpdateForm(data: DetailSourceData): SourceDataUpdateFormData {
    return {
        title: data.title,
        description: data.description,
        tags: data.tags,
        books: data.books,
        relations: data.relations,
        additionalInfo: data.additionalInfo,
        publishTime: data.publishTime
    }
}
