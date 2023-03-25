import { nextTick, Ref, ref } from "vue"
import { installation } from "@/utils/reactivity"
import { MetaTagEditor, MetaTagEditorProps, useMetaTagEditor } from "./MetaTagEditor/context"
import { SourceDataEditor, SourceDataEditorProps, useSourceDataEditor } from "./SourceDataEditor/context"
import { CreatingCollection, CreatingCollectionProps, useCreatingCollection } from "./CreatingCollection/context"
import { CreatingBook, CreatingBookProps, useCreatingBook } from "./CreatingBook/context"
import { AddIllust, AddIllustProps, useAddIllust } from "./AddIllust/context"

export type {
    SourceDataEditorProps,
    MetaTagEditorProps,
    CreatingCollectionProps,
    CreatingBookProps,
    AddIllustProps
}

export interface DialogService {
    sourceDataEditor: SourceDataEditor
    metaTagEditor: MetaTagEditor
    creatingCollection: CreatingCollection
    creatingBook: CreatingBook
    addIllust: AddIllust
}

type ServiceContext
    = { type: "sourceDataEditor", props: SourceDataEditorProps }
    | { type: "metaTagEditor", props: MetaTagEditorProps }
    | { type: "creatingCollection", props: CreatingCollectionProps }
    | { type: "creatingBook", props: CreatingBookProps }
    | { type: "addIllust", props: AddIllustProps }

export type Push = (nc: ServiceContext) => void

interface InternalDialogService extends DialogService {
    context: Ref<ServiceContext | null>
    push: Push
    close(): void
}

export const [installInternalService, useInternalService] = installation(function (): InternalDialogService {
    const context = ref<ServiceContext | null>(null)

    const push: Push = async (newContext: ServiceContext) => {
        if(context.value !== null) {
            (context.value.props as any)["cancel"]?.()
            context.value = null
            await nextTick()
        }
        context.value = newContext
    }

    const close = () => {
        if(context.value !== null) {
            (context.value.props as any)["cancel"]?.()
            context.value = null
        }
    }

    const sourceDataEditor = useSourceDataEditor(push)
    const metaTagEditor = useMetaTagEditor(push)
    const creatingCollection = useCreatingCollection(push)
    const creatingBook = useCreatingBook(push)
    const addIllust = useAddIllust(push)

    return {
        context,
        push,
        close,
        sourceDataEditor,
        metaTagEditor,
        creatingCollection,
        creatingBook,
        addIllust
    }
})

export const installDialogService: () => DialogService = installInternalService
export const useDialogService: () => DialogService = useInternalService
