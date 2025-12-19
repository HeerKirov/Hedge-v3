import path from "path"
import fs, { mkdir } from "fs/promises"
import { DATA_FILE } from "@/constants/file"
import { LocalOptions } from "."
import { FileManager } from "./file"

export interface FileDragManager {
    /**
     * 将一个文件拷贝至拖曳区，用于拖曳文件到外部。
     * @param options 文件路径和原始文件名
     * @return 拖曳区文件路径
     */
    makeDragFile(options: {filepath: string, originalFilename?: string}): Promise<string>
    /**
     * 清理所有的拖曳缓存。
     */
    cleanAllCacheFiles(): Promise<void>
}

export function createFileDragManager(fileManager: FileManager, options: LocalOptions): FileDragManager {
    const dragCacheDir = path.resolve(options.userDataPath, DATA_FILE.APPDATA.CHANNEL_FOLDER, options.channel, DATA_FILE.APPDATA.CHANNEL.DRAG_CACHES_DIR)
    return {
        async makeDragFile({filepath, originalFilename}: {filepath: string, originalFilename?: string}): Promise<string> {
            const localCachePath = path.join(dragCacheDir, originalFilename ?? path.basename(filepath))
            const r = await fileManager.loadFile(filepath)
            if(!r.ok) {
                throw new Error(r.message ?? "Unknown error")
            }
            await mkdir(path.dirname(localCachePath), {recursive: true})
            await fs.copyFile(r.data, localCachePath)
            return localCachePath
        },
        async cleanAllCacheFiles(): Promise<void> {
            await fs.rm(dragCacheDir, {recursive: true, force: true})
        }
    }
}