import { computed, onMounted, Ref, ref, shallowRef, watch } from "vue"
import { remoteIpcClient } from "@/functions/ipc-client"
import { IllustType, SimpleIllust } from "@/functions/http-client/api/illust"
import { useFetchHelper, useFetchReactive, usePaginationDataView, useQueryListview } from "@/functions/fetch"
import { FilePath } from "@/functions/http-client/api/all"
import { createLocalStorage } from "@/functions/app"
import { useMessageBox } from "@/modules/message-box"
import { dialogManager } from "@/modules/dialog"
import { useToast } from "@/modules/toast"
import { Push } from "../context"

export interface ExternalExporter {
    /**
     * 打开对外导出面板。
     */
    export(type: "ILLUST", illusts: (number | BasicIllust)[]): void
    /**
     * 打开对外导出面板。
     */
    export(type: "BOOK", book: number | BasicBook): void
}

export type ExternalExporterProps = {
    type: "ILLUST"
    illusts: (number | BasicIllust)[]
} | {
    type: "BOOK"
    book: number | BasicBook
}

interface BasicIllust { id: number, type: IllustType, filePath: FilePath }

interface BasicBook { id: number, title: string, imageCount: number, filePath: FilePath | null }

export function useExternalExporter(push: Push): ExternalExporter {
    return {
        export(type, targets) {
            push({
                type: "externalExporter",
                props: <ExternalExporterProps>(type === "ILLUST" ? {type: "ILLUST", illusts: targets} : {type: "BOOK", book: targets})
            })
        }
    }
}

export function useExporterData(data: ExternalExporterProps, close: () => void) {
    const toast = useToast()
    const message = useMessageBox()

    const preview = useExporterPreview(data)
    
    const localStorageAccessor = createLocalStorage<{externalLocation: string, packageMode: boolean, nameType: "ORIGINAL_FILENAME" | "SOURCE" | "ID" | undefined}>("export/default-params", () => ({externalLocation: "", packageMode: false, nameType: undefined}), true)
    
    const savedParams = localStorageAccessor.get()
    const externalLocation = ref(savedParams.externalLocation)
    const packageMode = ref(savedParams.packageMode)
    const packageName = ref("")
    const nameType = ref<"ORIGINAL_FILENAME" | "SOURCE" | "ID">(savedParams.nameType ?? "ORIGINAL_FILENAME")

    if(preview.type === "BOOK") {
        watch(preview.book, book => {
            if(book !== undefined) {
                packageName.value = book.title
            }
        }, {immediate: true})
    }else{
        packageName.value = "导出"
    }

    const openDialog = async () => {
        const res = await dialogManager.openDialog({
            title: "选择本地目录",
            properties: ["openDirectory", "createDirectory"]
        })
        if(res !== null) {
            externalLocation.value = res[0]
        }
    }

    const executing = ref(false)

    const executeExport = async () => {
        if(!externalLocation.value.trim()) {
            message.showOkMessage("prompt", "请指定导出位置。")
            return
        }
        if(preview.packagable.value && packageMode.value && !packageName.value.trim()) {
            message.showOkMessage("prompt", "请指定打包文件名。")
            return
        }
        executing.value = true
        const res = await remoteIpcClient.local.downloadExportFile({
            location: externalLocation.value.trim(),
            zip: preview.packagable.value && packageMode.value ? packageName.value.trim() : undefined,
            imageIds: preview.type === "ILLUST" ? preview.images.value.map(i => i.id) : undefined,
            bookId: preview.type === "BOOK" ? preview.book.value!.id : undefined,
            nameType: nameType.value
        })
        executing.value = false

        if(res !== undefined) {
            if(res.ok) {
                toast.toast("文件已导出", "success", `文件已成功导出到${externalLocation.value.trim()}.`)
                localStorageAccessor.set({externalLocation: externalLocation.value, packageMode: packageMode.value, nameType: nameType.value})
                close()
            }else if(res.code === "FILE_NOT_FOUND") {
                toast.toast(`文件导出错误`, "danger", "所选择的文件不存在。")
            }else if(res.code === "LOCATION_NOT_ACCESSIBLE") {
                toast.toast(`文件导出错误`, "danger", "选择的导出位置不可用。")
            }else if(res.code === "FILE_ALREADY_EXISTS") {
                toast.toast(`文件导出错误`, "danger", `文件${res.info}已存在。`)
            }else{
                toast.toast(`文件导出错误`, "danger", res.message ?? "")
            }
        }
    }

    return {packageName, packageMode, externalLocation, nameType, executing, openDialog, executeExport, preview}
}

function useExporterPreview(data: ExternalExporterProps) {
    if(data.type === "ILLUST") {
        //illusts的长度，或解析后的长度若为1，则走单项模式。此模式下右侧仅展示大图。
        //大于1，则走多项模式。此模式下右侧展示网格(若项较少则调整网格列数)，支持打包。
        const fetchIllustSituation = useFetchHelper(client => client.exportUtil.illustSituation)
        
        const images = ref<SimpleIllust[]>([])

        const packagable = computed(() => images.value.length > 1)
        
        onMounted(async () => {
            if(data.illusts.every(i => typeof i === "object" && i.type === "IMAGE")) {
                images.value = data.illusts.map(i => {
                    const target = <BasicIllust>i
                    return {id: target.id, filePath: target.filePath}
                })
            }else{
                const res = await fetchIllustSituation(data.illusts.map(i => typeof i === "number" ? i : i.id))
                if(res !== undefined && res.length > 0) {
                    images.value = res
                }
            }
        })

        return {type: "ILLUST", packagable, images} as const
    }else{
        //book模式。右侧展示book基本信息，并使用virtual grid展示内容，支持打包。
        const bookId = typeof data.book === "number" ? data.book : data.book.id

        const book: Ref<BasicBook | undefined> = typeof data.book === "object" ? shallowRef(data.book) : useFetchReactive({
            get: client => () => client.book.get(bookId)
        }).data

        const listview = useQueryListview({
            request: client => (offset, limit, _) => client.book.images.get(bookId, {offset, limit}),
            keyOf: item => item.id
        })

        const paginationData = usePaginationDataView({listview, bufferPercent: 0.2})
        
        return {type: "BOOK", packagable: shallowRef(true), book, paginationData} as const
    }
}