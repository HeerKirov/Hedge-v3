import { useFetchHelper } from "@/functions/fetch"
import { Push } from "../context"
import { FilePath } from "@/functions/http-client/api/all"

export interface AddIllust {
    /**
     * 对于将一组illust添加到指定的集合做检查。若有图像已存在于其他集合，则弹出对话框要求选择解决方案：将那些图像都加入此集合，还是忽略
     * @return 若选择忽略，则仅返回没有父集合的项；若选择添加或没有冲突，则返回全部项；若取消对话框，返回undefined
     */
    checkExistsInCollection(images: number[], collectionId: number): Promise<number[] | undefined>
    /**
     * 对于将一组illust添加到指定的画集做检查。若有图像已存在于此画集，则弹出对话框要求选择解决方案：将那些图像移动到新位置，还是忽略
     * @return 若选择忽略，则仅返回不属于此画集的项；若选择添加或没有冲突，则返回全部项；若取消对话框，返回undefined
     */
    checkExistsInBook(images: number[], bookId: number): Promise<number[] | undefined>
    /**
     * 对于将一组illust添加到指定的目录做检查。若有图像已存在于此目录，则弹出对话框要求选择解决方案：将那些图像移动到新位置，还是忽略
     * @return 若选择忽略，则仅返回不属于此画集的项；若选择添加或没有冲突，则返回全部项；若取消对话框，返回undefined
     */
    checkExistsInFolder(images: number[], folderId: number): Promise<number[] | undefined>
}

interface CaseCollectionProps {
    type: "collection"
    collectionId: number
    includeResolution: number[]
    ignoreResolution: number[]
    conflicts: {id: number, filePath: FilePath}[]
    resolve(_: number[] | undefined): void
    cancel(): void
}

interface CaseBookProps {
    type: "book"
    bookId: number
    moveResolution: number[]
    ignoreResolution: number[]
    duplicates: {id: number, filePath: FilePath, ordinal: number}[]
    resolve(_: number[] | undefined): void
    cancel(): void
}

interface CaseFolderProps {
    type: "folder"
    folderId: number
    moveResolution: number[]
    ignoreResolution: number[]
    duplicates: {id: number, filePath: FilePath, ordinal: number}[]
    resolve(_: number[] | undefined): void
    cancel(): void
}

export type AddIllustProps = CaseCollectionProps | CaseBookProps | CaseFolderProps

export function useAddIllust(push: Push): AddIllust {
    const fetchImageSituation = useFetchHelper(client => client.illustUtil.getImageSituation)
    const fetchBookSituation = useFetchHelper(client => client.illustUtil.getBookSituation)
    const fetchFolderSituation = useFetchHelper(client => client.illustUtil.getFolderSituation)

    return {
        async checkExistsInCollection(images: number[], collectionId: number): Promise<number[] | undefined> {
            const res = await fetchImageSituation(images)
            if(res !== undefined) {
                const conflicts = res.filter(d => d.belong !== null && d.belong.id !== collectionId).map(d => ({id: d.id, filePath: d.filePath}))
                if(conflicts.length <= 0) {
                    return images
                }else{
                    const ignoreResolution = res.filter(i => i.belong === null).map(i => i.id)
                    return new Promise(resolve => {
                        push({
                            type: "addIllust",
                            props: {type: "collection", collectionId, includeResolution: images, ignoreResolution, conflicts, resolve, cancel: () => resolve(undefined)}
                        })
                    })
                }
            }else{
                return undefined
            }
        },
        async checkExistsInBook(images: number[], bookId: number): Promise<number[] | undefined> {
            const res = await fetchBookSituation({illustIds: images, bookId})
            if(res !== undefined) {
                const duplicates = res.filter(d => d.ordinal !== null).map(d => ({id: d.id, filePath: d.filePath, ordinal: d.ordinal!}))
                if(duplicates.length <= 0) {
                    return images
                }else{
                    const ignoreResolution = res.filter(i => i.ordinal === null).map(i => i.id)
                    return new Promise(resolve => {
                        push({
                            type: "addIllust",
                            props: {type: "book", bookId, moveResolution: images, ignoreResolution, duplicates, resolve, cancel: () => resolve(undefined)}
                        })
                    })
                }
            }else{
                return undefined
            }
        },
        async checkExistsInFolder(images: number[], folderId: number): Promise<number[] | undefined> {
            const res = await fetchFolderSituation({illustIds: images, folderId})
            if(res !== undefined) {
                const duplicates = res.filter(d => d.ordinal !== null).map(d => ({id: d.id, filePath: d.filePath, ordinal: d.ordinal!}))
                if(duplicates.length <= 0) {
                    return images
                }else{
                    const ignoreResolution = res.filter(i => i.ordinal === null).map(i => i.id)
                    return new Promise(resolve => {
                        push({
                            type: "addIllust",
                            props: {type: "folder", folderId, moveResolution: images, ignoreResolution, duplicates, resolve, cancel: () => resolve(undefined)}
                        })
                    })
                }
            }else{
                return undefined
            }
        }
    }
}

export function useAddIllustContext(p: AddIllustProps, close: () => void): {situations: {ordinal: number | null, id: number, filePath: FilePath}[], chooseIgnore(): void, chooseResolve(): void} {
    if(p.type === "collection") {
        const chooseIgnore = () => {
            p.resolve(p.ignoreResolution)
            close()
        }

        const chooseResolve = () => {
            p.resolve(p.includeResolution)
            close()
        }

        return {situations: p.conflicts.map(d => ({...d, ordinal: null})), chooseIgnore, chooseResolve}
    }else if(p.type === "book") {
        const chooseIgnore = () => {
            p.resolve(p.ignoreResolution)
            close()
        }

        const chooseResolve = () => {
            p.resolve(p.moveResolution)
            close()
        }

        return {situations: p.duplicates, chooseIgnore, chooseResolve}
    }else{
        const chooseIgnore = () => {
            p.resolve(p.ignoreResolution)
            close()
        }

        const chooseResolve = () => {
            p.resolve(p.moveResolution)
            close()
        }

        return {situations: p.duplicates, chooseIgnore, chooseResolve}
    }
}
