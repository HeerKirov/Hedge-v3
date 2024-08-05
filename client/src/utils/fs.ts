import { Dirent, Mode } from "fs"
import nodeFsPromises from "fs/promises"
import compressing, { sourceType } from "compressing"

export function writeFile<T>(file: string, data: T): Promise<void> {
    return nodeFsPromises.writeFile(file, JSON.stringify(data), {encoding: "utf-8"})
}

export async function readFile<T>(file: string): Promise<T | null> {
    const data = await readFileText(file)
    return data != null ? JSON.parse(data) as T : null
}

export async function readFileText(file: string): Promise<string | null> {
    if(!await existsFile(file)) {
        return null
    }
    return await nodeFsPromises.readFile(file, {encoding: "utf-8"})
}

export async function existsFile(path: string): Promise<boolean> {
    try {
        await nodeFsPromises.access(path)
        return true
    }catch (_) {
        return false
    }
}

export function readdir(dir: string): Promise<Dirent[]> {
    return nodeFsPromises.readdir(dir, {withFileTypes: true})
}

export async function mkdir(path: string): Promise<void> {
    if(await existsFile(path)) {
        return
    }
    await nodeFsPromises.mkdir(path, {recursive: true})
}

export async function rmdir(path: string): Promise<void> {
    if(!await existsFile(path)) {
        return
    }
    await nodeFsPromises.rm(path, {recursive: true, force: true})
}

export function unzip(src: sourceType, dest: string): Promise<void> {
    return compressing.zip.uncompress(src, dest)
}

export function rename(src: string, dest: string): Promise<void> {
    return nodeFsPromises.rename(src, dest)
}

export function chmod(dest: string, mode: Mode): Promise<void> {
    return nodeFsPromises.chmod(dest, mode)
}
