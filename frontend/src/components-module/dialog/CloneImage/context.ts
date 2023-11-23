import { computed, Ref, ref } from "vue"
import { ImagePropsCloneForm } from "@/functions/http-client/api/illust"
import { Push } from "../context"
import { useLocalStorage } from "@/functions/app"
import { usePostFetchHelper } from "@/functions/fetch"

export interface CloneImage {
    /**
     * 打开一个对话框，执行图像属性克隆操作。
     * 可以预先指定from和to，也可以都不指定，在对话框里拖放解决。
     * 关系克隆操作可以选择要对哪些属性做克隆，以及要不要删除from图像。
     */
    clone(options: {from?: number, to?: number}, onSucceed?: (from: number, to: number, fromDeleted: boolean) => void): void
    /**
     * 打开一个对话框，执行图像属性克隆的参数选定操作。
     * 它不会实际执行属性克隆，而是异步返回属性克隆的参数，后续应当手动调用属性克隆API。
     */
    getCloneProps(options: {from: number, to: number}): Promise<ImagePropsCloneForm | undefined>
}

export interface CloneImageProps {
    from: number | null
    to: number | null
    onSucceed?(from: number, to: number, fromDeleted: boolean): void
    onlyGetProps?(form: ImagePropsCloneForm): void
    cancel(): void
}

export function useCloneImage(push: Push): CloneImage {
    return {
        clone(options, onSucceed) {
            push({
                type: "cloneImage",
                props: {from: options.from ?? null, to: options.to ?? null, onSucceed, cancel: () => {}}
            })
        },
        getCloneProps(options) {
            return new Promise(resolve => {
                push({
                    type: "cloneImage",
                    props: {from: options.from ?? null, to: options.to ?? null, onlyGetProps: resolve, cancel: () => resolve(undefined)}
                })
            })
        },
    }
}

export function useCloneImageContext(from: number | null, to: number | null, onSucceed?: (from: number, to: number, fromDeleted: boolean) => void, onlyGetProps?: (form: ImagePropsCloneForm) => void) {
    const fetchCloneImage = usePostFetchHelper(client => client.illust.cloneImageProps)

    const fromId = ref(from)
    const toId = ref(to)

    const ids = computed(() => [fromId.value, toId.value])
    const titles = ["FROM", "TO"]
    const droppable = onlyGetProps === undefined

    const exchange = () => {
        function exchangeRefValue<T>(a: Ref<T>, b: Ref<T>) {
            const tmp = a.value
            a.value = b.value
            b.value = tmp
        }

        exchangeRefValue(fromId, toId)
    }

    const updateId = (index: number, id: number) => {
        if(index === 0) fromId.value = id
        else toId.value = id
    }

    const options = useLocalStorage<Form>("dialog/clone-image/options", () => ({
        score: true, favorite: true, description: true, tagme: true, metaTags: true, orderTime: true, collection: true, books: true, folders: true
    }), true)

    const execute = async () => {
        if(fromId.value !== null && toId.value !== null) {
            if(onlyGetProps) {
                const { merge, deleteFrom, ...props } = options.value
                onlyGetProps({props, merge, deleteFrom, from: fromId.value, to: toId.value})
            }else{
                const { merge, deleteFrom, ...props } = options.value
                const res = await fetchCloneImage({props, merge, deleteFrom, from: fromId.value, to: toId.value})
                if(res && onSucceed) onSucceed(fromId.value, toId.value, deleteFrom ?? false)
            }
        }
    }

    return {fromId, toId, ids, titles, droppable, exchange, updateId, options, execute}
}

export type Form = ImagePropsCloneForm["props"] & {merge?: boolean, deleteFrom?: boolean}

export const FORM_PROPS: (keyof Form)[] = ["score", "favorite", "description", "tagme", "metaTags", "partitionTime", "orderTime", "collection", "books", "folders", "source"]
export const FORM_OPTIONS: (keyof Form)[] = ["merge", "deleteFrom"]

export const FORM_TITLE: {[key in keyof Form]: string} = {
    score: "评分",
    favorite: "收藏",
    description: "描述",
    tagme: "Tagme",
    metaTags: "标签",
    partitionTime: "时间分区",
    orderTime: "排序时间",
    collection: "所属集合",
    books: "所属画集",
    folders: "所属目录",
    source: "来源",
    merge: "合并复合关系而不是覆盖",
    deleteFrom: "克隆完成后，删除源图像"
}
