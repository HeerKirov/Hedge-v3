import { HttpInstance, Response } from ".."
import { SimpleIllust } from "./illust"

export function createUtilExportEndpoint(http: HttpInstance): UtilExportEndpoint {
    return {
        illustSituation: http.createDataRequest("/api/utils/export/illust-situation", "POST")
    }
}

export interface UtilExportEndpoint {
    illustSituation(illusts: number[]): Promise<Response<SimpleIllust[]>>
}
