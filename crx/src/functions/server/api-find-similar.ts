import { SourceDataPath, IdResponse, FilePath, SimpleBook } from "./api-all"
import { createDataRequest, createPathRequest } from "./impl"
import { NotFound } from "./exceptions"

export const quickFind = {
    upload: createDataRequest<QuickFindUploadForm, IdResponse, never>("/api/find-similar/quick-find/upload", "POST", {
        parseData: parseForm
    }),
    get: createPathRequest<number, QuickFindResult, NotFound>(id => `/api/find-similar/quick-find/${id}`, "GET")
}

function parseForm(form: QuickFindUploadForm): FormData {
    const ret = new FormData()
    ret.append("file", form.file)
    if(form.topics?.length) ret.append("topics", JSON.stringify(form.topics))
    if(form.authors?.length) ret.append("authors", JSON.stringify(form.authors))
    return ret
}

export interface QuickFindUploadForm {
    file: File
    topics?: number[]
    authors?: number[]
}

export interface QuickFindResult {
    id: number
    succeed: boolean
    result: FindSimilarResultDetailImage[]
}

export interface FindSimilarResultDetailImage {
    id: number
    filePath: FilePath
    favorite: boolean
    orderTime: string
    partitionTime: string
    score: number | null
    source: SourceDataPath | null
    parentId: number | null
    books: SimpleBook[]
}