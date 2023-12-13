import { ref } from "vue"
import { useFetchHelper } from "@/functions/fetch"
import { FilePath } from "@/functions/http-client/api/all"
import { CollectionImagesUpdateForm } from "@/functions/http-client/api/illust"
import { CollectionSituation } from "@/functions/http-client/api/util-illust"
import { Push } from "../context"
import { arrays } from "@/utils/primitives"

export interface AddIllust {
    /**
     * 对于将一组illust添加到指定的集合做检查。若有图像已存在于其他集合，则弹出对话框要求选择解决方案：将那些图像都加入此集合，还是忽略
     * @return 若选择忽略，则仅返回没有父集合的项；若选择添加或没有冲突，则返回全部项；若取消对话框，返回undefined
     */
    checkExistsInCollection(images: number[], collectionId: number): Promise<CollectionImagesUpdateForm | undefined>
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

export interface CaseCollectionProps {
    type: "collection"
    collectionId: number
    situations: CollectionSituation[]
    resolve(_: CollectionImagesUpdateForm | undefined): void
    cancel(): void
}

export interface CaseBookProps {
    type: "book"
    bookId: number
    moveResolution: number[]
    ignoreResolution: number[]
    duplicates: {id: number, filePath: FilePath, ordinal: number}[]
    resolve(_: number[] | undefined): void
    cancel(): void
}

export interface CaseFolderProps {
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
    const fetchCollectionSituation = useFetchHelper(client => client.illustUtil.getCollectionSituation)
    const fetchBookSituation = useFetchHelper(client => client.illustUtil.getBookSituation)
    const fetchFolderSituation = useFetchHelper(client => client.illustUtil.getFolderSituation)

    return {
        async checkExistsInCollection(images: number[], collectionId: number): Promise<CollectionImagesUpdateForm | undefined> {
            const situations = await fetchCollectionSituation([collectionId, ...images])
            if(situations !== undefined) {
                if(situations.length > 1 || situations.reduce((a, b) => a + b.collections.length, 0) > 1) {
                    //当存在多个situations(意味着分属多个时间分区)或存在多个collections(意味着有存在于除自己以外其他集合的图像)，就开启确认对话框
                    return new Promise(resolve => {
                        push({
                            type: "addIllust",
                            props: {type: "collection", collectionId, situations: situations, resolve, cancel: () => resolve(undefined)}
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

export function useAddIllustCollectionContext(p: CaseCollectionProps, close: () => void) {
    const situations = p.situations.map(s => ({...s, totalImageCount: s.images.length + s.collections.map(c => c.belongs.length).reduce((a, b) => a + b, 0)}))

    const collectionTotalCount = p.situations.reduce((a, b) => a + b.collections.length, 0)

    const selectedPartition = ref<number | null>(situations.length > 1 ? situations.find(s => s.collections.some(c => c.collectionId === p.collectionId))!.partitionTime!.timestamp : null)

    const selectedCollections = ref<Record<number, boolean | undefined>>({})

    const submit = () => {
        const illustIds: number[] = []
        for(const s of situations) {
            for(const c of s.collections) {
                if(c.collectionId !== p.collectionId && selectedCollections.value[c.collectionId] !== false) {
                    illustIds.push(...c.belongs)
                }
            }
            illustIds.push(...s.images.map(i => i.id))
        }

        const specifyPartitionTime = selectedPartition.value !== null ? situations.find(s => s.partitionTime!.timestamp === selectedPartition.value)!.partitionTime! : undefined

        p.resolve({illustIds, specifyPartitionTime})
        close()
    }

    return {situations, collectionTotalCount, selectedPartition, selectedCollections, submit}
}

export function useAddIllustBookFolderContext(p: CaseBookProps | CaseFolderProps, close: () => void): {situations: {ordinal: number | null, id: number, filePath: FilePath}[], chooseIgnore(): void, chooseResolve(): void} {
    if(p.type === "book") {
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
