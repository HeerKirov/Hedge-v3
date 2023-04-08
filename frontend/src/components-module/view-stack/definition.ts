import { AllSlice, ListIndexSlice, SingletonSlice, SliceOrPath } from "@/functions/fetch"
import { Illust } from "@/functions/http-client/api/illust"
import { Book } from "@/functions/http-client/api/book"
import { StacksOperationContext } from "./context"

export type StackViewInfo = StackViewImageInfo | StackViewCollectionInfo | StackViewBookInfo
interface StackViewImageInfo {
    type: "image"
    sliceOrPath: SliceOrPath<Illust, AllSlice<Illust> | ListIndexSlice<Illust>, number[]>
    modifiedCallback?: (illustId: number) => void
}
interface StackViewCollectionInfo {
    type: "collection"
    sliceOrPath: SliceOrPath<Illust, SingletonSlice<Illust>, number>
}
interface StackViewBookInfo {
    type: "book"
    sliceOrPath: SliceOrPath<Book, SingletonSlice<Book>, number>
}

export function generateOperations({ push, setRootView }: StacksOperationContext<StackViewInfo>) {
    return {
        openImageView(slice: AllSlice<Illust> | ListIndexSlice<Illust> | number[], modifiedCallback?: (illustId: number) => void, isRootView?: boolean) {
            const sliceOrPath: SliceOrPath<Illust, AllSlice<Illust> | ListIndexSlice<Illust>, number[]> = slice instanceof Array ? {type: "path", path: slice} : {type: "slice", slice}
            const info: StackViewImageInfo = {type: "image", sliceOrPath, modifiedCallback}
            const call = (isRootView ? setRootView : push)
            call(info)
        },
        openCollectionView(slice: SingletonSlice<Illust> | number, isRootView?: boolean) {
            const sliceOrPath: SliceOrPath<Illust, SingletonSlice<Illust>, number> = typeof slice === "number" ? {type: "path", path: slice} : {type: "slice", slice}
            const info: StackViewCollectionInfo = {type: "collection", sliceOrPath}
            const call = (isRootView ? setRootView : push)
            call(info)
        },
        openBookView(slice: SingletonSlice<Book> | number, isRootView?: boolean) {
            const sliceOrPath: SliceOrPath<Book, SingletonSlice<Book>, number> = typeof slice === "number" ? {type: "path", path: slice} : {type: "slice", slice}
            const info: StackViewBookInfo = {type: "book", sliceOrPath}
            const call = (isRootView ? setRootView : push)
            call(info)
        }
    }
}
