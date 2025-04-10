import emptyFile from "@/assets/empty-file.jpg"
import { strings } from "@/utils/primitives"
import { HttpInstance } from ".."


export interface StaticFiles {
    assetsUrl(filepath: string | null | undefined): string
}

export function createStaticFiles(http: HttpInstance): StaticFiles {
    return {
        assetsUrl(filepath: string | null | undefined): string {
            if(filepath) {
                const baseUrl = http.baseUrl()
                return baseUrl ? strings.pathJoin(baseUrl, "archives", filepath) : strings.pathJoin("archives", filepath)
            }else{
                return emptyFile
            }
        }
    }
}