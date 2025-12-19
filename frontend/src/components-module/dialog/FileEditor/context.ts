import { onMounted, ref } from "vue"
import { SimpleIllust } from "@/functions/http-client/api/illust"
import { useFetchHelper, usePostFetchHelper } from "@/functions/fetch"
import { Push } from "../context"

export interface FileEditor {
    /**
     * 打开执行格式转换面板。
     */
    convertFormat(illustIds: number[]): void
}

export type FileEditorProps = {
    type: "convertFormat"
    illustIds: number[]
}

export function useFileEditor(push: Push): FileEditor {
    return {
        convertFormat(illustIds) {
            push({
                type: "fileEditor",
                props: {type: "convertFormat", illustIds}
            })
        }
    }
}

export function useConvertFormat(data: FileEditorProps, close: () => void) {
    const fetchImageSituation = useFetchHelper(client => client.illustUtil.getImageSituation)
    const fetchConvertFormat = usePostFetchHelper(client => client.fileUtil.convertFormat)

    const state = ref<"LOADING" | "CHECK" | "FETCHING" | "COMPLETE">("LOADING")
    const illusts = ref<(SimpleIllust & {state: "CHECK" | "FETCHING" | "COMPLETE"})[]>([])

    onMounted(async () => {
        const result = await fetchImageSituation(data.illustIds)
        if(result) {
            illusts.value = result.filter(i => i.filePath.extension.toLowerCase() === "png").map(i => ({id: i.id, filePath: i.filePath, state: "CHECK"}))
            state.value = "CHECK"
        }
    })

    const submit = async () => {
        if(state.value === "CHECK") {
            for(const illust of illusts.value) {
                illust.state = "FETCHING"
                await fetchConvertFormat({illustId: illust.id})
                illust.state = "COMPLETE"
            }
            state.value = "COMPLETE"
        }else if(state.value === "COMPLETE") {
            close()
        }
    }

    return {state, illusts, submit}
}
