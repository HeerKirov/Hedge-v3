import { SingletonSlice, Slice } from "@/functions/fetch"
import { Illust } from "@/functions/http-client/api/illust"
import { Book } from "@/functions/http-client/api/book"
import { StacksOperationContext } from "./context"

export type StackViewInfo = StackViewImageInfo | StackViewCollectionInfo | StackViewBookInfo
interface StackViewImageInfo {
    type: "image"
    data: SliceOrIndex<Illust, Slice<Illust>, number[]>
    onIndexModified?: (modifiedIndex: number) => void
}
interface StackViewCollectionInfo {
    type: "collection"
    data: SliceOrIndex<Illust, SingletonSlice<Illust>, number>
}
interface StackViewBookInfo {
    type: "book"
    data: SliceOrIndex<Book, SingletonSlice<Book>, number>
}

export type SliceOrIndex<T, S extends Slice<T>, I extends (number[] | number)> = {
    type: "slice"
    slice: S
} | {
    type: "index"
    index: I
}

export function generateOperations({ push, setRootView }: StacksOperationContext<StackViewInfo>) {
    return {
        openImageView(slice: Slice<Illust> | number[], onIndexModified?: (modifiedIndex: number) => void, isRootView?: boolean) {
            //TODO 内容变更监听机制：监听到内容列表清零就自动关闭 移动到View组件的根部
            // const modifiedEvent = (e: ModifiedEvent<Illust>) => {
            //     if(e.type === "REMOVE" && finalData.count() <= 0) {
            //         close(info)
            //     }
            // }
            // finalData.syncOperations.modified.addEventListener(modifiedEvent)
            const data: SliceOrIndex<Illust, Slice<Illust>, number[]> = slice instanceof Array ? {type: "index", index: slice} : {type: "slice", slice}
            const info: StackViewImageInfo = {type: "image", data, onIndexModified}
            const call = (isRootView ? setRootView : push)
            call(info)
        },
        openCollectionView(slice: SingletonSlice<Illust> | number, isRootView?: boolean) {
            const data: SliceOrIndex<Illust, SingletonSlice<Illust>, number> = typeof slice === "number" ? {type: "index", index: slice} : {type: "slice", slice}
            const info: StackViewCollectionInfo = {type: "collection", data}
            const call = (isRootView ? setRootView : push)
            call(info)
        },
        openBookView(slice: SingletonSlice<Book> | number, isRootView?: boolean) {
            const data: SliceOrIndex<Book, SingletonSlice<Book>, number> = typeof slice === "number" ? {type: "index", index: slice} : {type: "slice", slice}
            const info: StackViewBookInfo = {type: "book", data}
            const call = (isRootView ? setRootView : push)
            call(info)
        }
    }
}
