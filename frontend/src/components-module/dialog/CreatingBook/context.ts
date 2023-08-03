import { Ref, ref } from "vue"
import { BookCreateForm } from "@/functions/http-client/api/book"
import { useCreatingHelper, useFetchHelper } from "@/functions/fetch"
import { useMessageBox } from "@/modules/message-box"
import { computedAsync } from "@/utils/reactivity"
import { Push } from "../context"

export interface CreatingBook {
    /**
     * 传入一组images，创建一个画集。一般用于contextmenu。
     * 对话框中可以编辑画集的基本信息，并显示初始images项列表。
     * @param images 要用作创建画集的image id列表。
     * @param onCreated 如果成功创建画集，则执行回调。
     */
    createBook(images?: number[], onCreated?: (bookId: number) => void): void
}

export interface CreatingBookProps {
    images: number[]
    onCreated?(bookId: number): void
}

export function useCreatingBook(push: Push): CreatingBook {
    return {
        async createBook(images, onCreated) {
            push({
                type: "creatingBook",
                props: {images: images ?? [], onCreated}
            })
        }
    }
}

export function useCreatingBookContext(images: Ref<number[]>, onCreated: (bookId: number) => void) {
    const message = useMessageBox()
    const fetchImageSituation = useFetchHelper(client => client.illustUtil.getImageSituation)

    const form = ref<BookCreateForm>({images: images.value})

    const { submit } = useCreatingHelper({
        form,
        mapForm: f => f,
        create: client => client.book.create,
        handleError(e) {
            if(e.code === "NOT_EXIST") {
                const [_, list] = e.info
                message.showOkMessage("prompt", "选择的项目不存在。", `不存在的项目: ${list.join(", ")}`)
            }else{
                return e
            }
        },
        afterCreate(result) {
            onCreated(result.id)
        }
    })

    const files = computedAsync([], async () => {
        if(images.value.length > 0) {
            const res = await fetchImageSituation(images.value)
            if(res !== undefined) {
                return res.map(item => item.filePath.sample)
            }
        }
        return []
    })

    return {form, submit, files}
}
