import { AllSlice, ListIndexSlice, SingletonSlice, SliceOrPath } from "@/functions/fetch"
import { Illust } from "@/functions/http-client/api/illust"
import { Book } from "@/functions/http-client/api/book"
import { StacksOperationContext } from "./context"

export type StackViewInfo = StackViewImageInfo | StackViewCollectionInfo | StackViewBookInfo
interface StackViewImageInfo {
    type: "image"
    sliceOrPath: SliceOrPath<Illust, number, AllSlice<Illust, number> | ListIndexSlice<Illust, number>, number[]>
    modifiedCallback?: (illustId: number) => void
}
interface StackViewCollectionInfo {
    type: "collection"
    sliceOrPath: SliceOrPath<Illust, number, SingletonSlice<Illust, number>, number>
}
interface StackViewBookInfo {
    type: "book"
    sliceOrPath: SliceOrPath<Book, number, SingletonSlice<Book, number>, number>
}

export function generateOperations({ push, setRootView }: StacksOperationContext<StackViewInfo>) {
    return {
        openImageView(slice: AllSlice<Illust, number> | ListIndexSlice<Illust, number> | number[] | {imageIds: number[], focusIndex?: number}, modifiedCallback?: (illustId: number) => void, isRootView?: boolean) {
            const sliceOrPath: SliceOrPath<Illust, number, AllSlice<Illust, number> | ListIndexSlice<Illust, number>, number[]>
                = slice instanceof Array ? {type: "path", path: slice} 
                : (<AllSlice<Illust, number>>slice).type === "ALL" ? {type: "slice", slice: <AllSlice<Illust, number>>slice}
                : (<ListIndexSlice<Illust, number>>slice).type === "LIST" ? {type: "slice", slice: <AllSlice<Illust, number>>slice}
                : {type: "path", path: (<{imageIds: number[], focusIndex: number}>slice).imageIds, focusIndex: (<{imageIds: number[], focusIndex: number}>slice).focusIndex}
            const info: StackViewImageInfo = {type: "image", sliceOrPath, modifiedCallback}
            const call = (isRootView ? setRootView : push)
            call(info)
        },
        openCollectionView(slice: SingletonSlice<Illust, number> | number, isRootView?: boolean) {
            const sliceOrPath: SliceOrPath<Illust, number, SingletonSlice<Illust, number>, number> = typeof slice === "number" ? {type: "path", path: slice} : {type: "slice", slice}
            const info: StackViewCollectionInfo = {type: "collection", sliceOrPath}
            const call = (isRootView ? setRootView : push)
            call(info)
        },
        openBookView(slice: SingletonSlice<Book, number> | number, isRootView?: boolean) {
            const sliceOrPath: SliceOrPath<Book, number, SingletonSlice<Book, number>, number> = typeof slice === "number" ? {type: "path", path: slice} : {type: "slice", slice}
            const info: StackViewBookInfo = {type: "book", sliceOrPath}
            const call = (isRootView ? setRootView : push)
            call(info)
        }
    }
}
