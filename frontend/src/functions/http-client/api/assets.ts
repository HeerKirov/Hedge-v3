import emptyFile from "@/assets/empty-file.jpg"
import { strings } from "@/utils/primitives"
import { HttpInstance } from ".."


export interface Assets {
    assetsUrl(filepath: string | null | undefined): string
}

export function createAssets(http: HttpInstance): Assets {
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