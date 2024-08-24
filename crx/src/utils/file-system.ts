
interface SaveFileOptions {
    suggestedName?: string
    types?: [string, string, string][]
    content: string | Blob
}

interface ReadFileOptions {
    types?: [string, string, string][]
    multiple?: boolean
}

export const JSON_TYPE: [string, string, string] = ["*.json", "application/json", ".json"]
export const HTML_TYPE: [string, string, string] = ["*.html", "text/html", ".html"]

export async function saveFile(options: SaveFileOptions) {
    let handle: FileSystemFileHandle
    try {
        handle = await window.showSaveFilePicker({
            suggestedName: options.suggestedName,
            types: options.types?.map(([description, mime, ext]) => ({description, accept: {[mime]: ext}}))
        })
    }catch(e) {
        if(e instanceof DOMException && e.message === "The user aborted a request.") {
            return
        }else{
            throw e
        }
    }
    const writable = await handle.createWritable()
    try {
        await writable.write(options.content)
    }finally{
        await writable.close()
    }
}

export async function readFile(options: ReadFileOptions): Promise<string | undefined> {
    let handle: FileSystemFileHandle
    try {
        [handle] = await window.showOpenFilePicker({
            multiple: options.multiple,
            types: options.types?.map(([description, mime, ext]) => ({description, accept: {[mime]: ext}}))
        })
    }catch(e) {
        if(e instanceof DOMException && e.message === "The user aborted a request.") {
            return undefined
        }else{
            throw e
        }
    }
    const file = await handle.getFile()
    return await file.text()
}
