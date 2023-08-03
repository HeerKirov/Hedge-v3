import { HttpInstance, Response } from ".."
import { LocationNotAccessibleError } from "../exceptions"
import { FilePath } from "./all"

export function createUtilExportEndpoint(http: HttpInstance): UtilExportEndpoint {
    return {
        illustSituation: http.createDataRequest("/api/utils/export/illust-situation", "POST"),
        executeExport: http.createDataRequest("/api/utils/export/execute-export", "POST")
    }
}

export interface UtilExportEndpoint {
    illustSituation(illusts: number[]): Promise<Response<ExportSituationImage[]>>
    executeExport(form: ExportExecuteForm): Promise<Response<ExportExecution, LocationNotAccessibleError>>
}

export interface ExportExecuteForm {
    location: string
    packageName?: string | null
    imageIds?: number[]
    bookId?: number
}

export interface ExportSituationImage {
    id: number
    filePath: FilePath
}

export interface ExportExecution {
    success: number
    errors: {id: number, exportFilename: string, message: string}[]
}