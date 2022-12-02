import emptyFile from "@/assets/empty-file.jpg"
import { HttpInstance } from ".."


export interface Assets {
    assetsUrl(filepath: string | null | undefined): string
}

export function createAssets(http: HttpInstance): Assets {
    return {
        assetsUrl(filepath: string | null | undefined): string {
            if(filepath) {
                const baseUrl = http.baseUrl()
                return baseUrl ? pathJoin(baseUrl, "folders", filepath) : pathJoin("folders", filepath)
            }else{
                return emptyFile
            }
        }
    }
}

function pathJoin(...paths: string[]): string {
    let ret = ""
    for(const p of paths) {
        const path = p.endsWith("/") ? p.substring(0, p.length - 1) : p
        if(ret) {
            ret += path.startsWith("/") ? path : ("/" + path)
        }else{
            ret = path
        }
    }
    return ret
}
