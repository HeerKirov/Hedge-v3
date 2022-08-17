import nodeFs, { Dirent, Mode } from "fs"
import nodeFsPromises from "fs/promises"
import unzipper from "unzipper"
import { exec, spawn } from "child_process"
import { promisify } from "util"

export function writeFile<T>(file: string, data: T): Promise<void> {
    return nodeFsPromises.writeFile(file, JSON.stringify(data), {encoding: "utf-8"})
}

export function appendFileText(file: string, data: string): Promise<void> {
    return nodeFsPromises.writeFile(file, data, {encoding: "utf-8"})
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
    await promisify(exec)(`rm -rf ${path}`)
}

export function cpR(src: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const s = spawn("cp", ["-r", src, dest])
        s.on('close', code => {
            if(code === 0) {
                resolve()
            }else{
                reject(new Error("cp -r throws an error."))
            }
        })
    })
}

export function unzip(src: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
        nodeFs.createReadStream(src)
            .pipe(unzipper.Extract({path: dest}))
            .on('close', resolve)
            .on('error', reject)
    })
}

export function rename(src: string, dest: string): Promise<void> {
    return nodeFsPromises.rename(src, dest)
}

export function chmod(dest: string, mode: Mode): Promise<void> {
    return nodeFsPromises.chmod(dest, mode)
}
