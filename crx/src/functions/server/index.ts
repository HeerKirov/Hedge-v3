import { BasicException } from "./exceptions"
import { Response, fetchRequestByMessage } from "./impl"
import { AppHealth, app } from "./api-app"
import { illust } from "./api-illust"
import { sourceData } from "./api-source-data"
import { quickFind } from "./api-find-similar"
import { sourceTagMapping } from "./api-source-tag-mapping"
import { setting } from "./api-setting"

export const server = {
    app,
    setting,
    illust,
    sourceData,
    quickFind,
    sourceTagMapping
}

export { fetchRequestByMessage }
export type { Response, BasicException, AppHealth }