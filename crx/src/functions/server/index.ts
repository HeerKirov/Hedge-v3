import { BasicException } from "./exceptions"
import { Response, fetchRequestByMessage } from "./impl"
import { AppHealth, app } from "./api-app"
import { sourceData } from "./api-source-data"
import { quickFind } from "./api-find-similar"
import { sourceTagMapping } from "./api-source-tag-mapping"

export const server = {
    app,
    sourceData,
    quickFind,
    sourceTagMapping
}

export { fetchRequestByMessage }
export type { Response, BasicException, AppHealth }