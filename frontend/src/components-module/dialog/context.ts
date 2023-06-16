import { nextTick, Ref, ref } from "vue"
import { installation } from "@/utils/reactivity"
import { MetaTagEditor, MetaTagEditorProps, useMetaTagEditor } from "./MetaTagEditor/context"
import { SourceDataEditor, SourceDataEditorProps, useSourceDataEditor } from "./SourceDataEditor/context"
import { CreatingCollection, CreatingCollectionProps, useCreatingCollection } from "./CreatingCollection/context"
import { CreatingBook, CreatingBookProps, useCreatingBook } from "./CreatingBook/context"
import { AddIllust, AddIllustProps, useAddIllust } from "./AddIllust/context"
import { AddToFolder, AddToFolderProps, useAddToFolder } from "./AddToFolder/context"
import { CloneImage, CloneImageProps, useCloneImage } from "./CloneImage/context"
import { FindSimilarTaskExplorer, FindSimilarTaskExplorerProps, useFindSimilarTaskExplorer } from "./FindSimilarTaskExplorer/context"
import { AssociateExplorer, AssociateExplorerProps, useAssociateExplorer } from "./AssociateExplorer/context"
import { ExternalExporter, ExternalExporterProps, useExternalExporter } from "./ExternalExporter/context"

export type {
    SourceDataEditorProps,
    MetaTagEditorProps,
    CreatingCollectionProps,
    CreatingBookProps,
    AddIllustProps,
    AddToFolderProps,
    CloneImageProps,
    FindSimilarTaskExplorerProps,
    AssociateExplorerProps,
    ExternalExporterProps
}

export interface DialogService {
    sourceDataEditor: SourceDataEditor
    metaTagEditor: MetaTagEditor
    creatingCollection: CreatingCollection
    creatingBook: CreatingBook
    addIllust: AddIllust
    addToFolder: AddToFolder
    cloneImage: CloneImage
    findSimilarTaskExplorer: FindSimilarTaskExplorer
    associateExplorer: AssociateExplorer
    externalExporter: ExternalExporter
}

type ServiceContext
    = { type: "sourceDataEditor", props: SourceDataEditorProps }
    | { type: "metaTagEditor", props: MetaTagEditorProps }
    | { type: "creatingCollection", props: CreatingCollectionProps }
    | { type: "creatingBook", props: CreatingBookProps }
    | { type: "addIllust", props: AddIllustProps }
    | { type: "addToFolder", props: AddToFolderProps }
    | { type: "cloneImage", props: CloneImageProps }
    | { type: "findSimilarTaskExplorer", props: FindSimilarTaskExplorerProps }
    | { type: "associateExplorer", props: AssociateExplorerProps }
    | { type: "externalExporter", props: ExternalExporterProps }

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
    const addToFolder = useAddToFolder(push)
    const cloneImage = useCloneImage(push)
    const findSimilarTaskExplorer = useFindSimilarTaskExplorer(push)
    const associateExplorer = useAssociateExplorer(push)
    const externalExporter = useExternalExporter(push)

    return {
        context,
        push,
        close,
        sourceDataEditor,
        metaTagEditor,
        creatingCollection,
        creatingBook,
        addIllust,
        addToFolder,
        cloneImage,
        findSimilarTaskExplorer,
        associateExplorer,
        externalExporter
    }
})

export const installDialogService: () => DialogService = installInternalService
export const useDialogService: () => DialogService = useInternalService
