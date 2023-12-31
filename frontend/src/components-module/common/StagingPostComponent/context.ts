import { ComponentPublicInstance, computed, onUnmounted, ref } from "vue"
import { useRoute } from "vue-router"
import { useLocalStorage } from "@/functions/app"
import { useFetchHelper, usePostFetchHelper } from "@/functions/fetch"
import { mapResponse } from "@/functions/http-client"
import { useToast } from "@/modules/toast"
import { useDroppable } from "@/modules/drag"
import { useMessageBox } from "@/modules/message-box"
import { useBrowserTabs } from "@/modules/browser"
import { useDialogService } from "@/components-module/dialog"
import { useHomepageState } from "@/services/main/homepage"
import { useListViewContext } from "@/services/base/list-view-context"
import { toRef, toRefNullable } from "@/utils/reactivity"
import { onOutsideClick } from "@/utils/sensors"

export function useButtonContext() {
    const route = useRoute()
    const message = useMessageBox()
    const { data: homepageState } = useHomepageState()

    const stagingPostCount = toRefNullable(homepageState, "stagingPostCount")

    const fetchUpdate = usePostFetchHelper({
        request: client => client.stagingPost.update,
        handleErrorInRequest(e) {
            if(e.code === "NOT_EXIST") {
                const [_, list] = e.info
                message.showOkMessage("error", "选择的项目不存在。", `不存在的项目: ${list.join(", ")}`)
            }else{
                return e
            }
        }
    })
    
    const { dragover: _, ...dropEvents } = useDroppable("illusts", illusts => fetchUpdate({action: "ADD", images: illusts.map(i => i.id)}))

    const active = computed(() => route.name === "MainStagingPost")

    const visible = ref(false)

    const divRef = ref<HTMLElement>()
    const calloutRef = ref<ComponentPublicInstance>()

    onOutsideClick([divRef, calloutRef], () => {
        if(visible.value) {
            visible.value = false
        }
    })

    return {stagingPostCount, dropEvents, divRef, calloutRef, visible, active}
}

export function useCalloutContext() {
    const maxWidth = 900
    const minWidth = 250
    const maxHeight = 600
    const minHeight = 200
    const defaultWidth = 400
    const defaultHeight = 300
    const attachRange = 10
    const localStorage = useLocalStorage<{size: {width: number, height: number}}>("staging-post/callout", () => ({size: {width: defaultWidth, height: defaultHeight}}), true)

    const calloutSize = toRef(localStorage, "size")

    const areaRef = ref<ComponentPublicInstance>()

    const resizing = ref<"top" | "right" | "top-right" | null>(null)

    const resizeAreaMouseDown = (type: "top" | "right" | "top-right") => {
        resizing.value = type
        document.addEventListener('mousemove', mouseMove)
        document.addEventListener('mouseup', mouseUp)
    }

    const mouseMove = (e: MouseEvent) => {
        if(areaRef.value) {
            const el: HTMLElement = areaRef.value.$el
            if(resizing.value === "right" || resizing.value === "top-right") {
                const newWidth = e.pageX - el.getBoundingClientRect().left
                calloutSize.value.width
                    = newWidth > maxWidth ? maxWidth
                    : newWidth < minWidth ? minWidth
                    : Math.abs(newWidth - defaultWidth) <= attachRange ? defaultWidth
                    : newWidth
            }

            if(resizing.value === "top" || resizing.value === "top-right") {
                const newHeight = el.getBoundingClientRect().top + el.clientHeight - e.pageY
                calloutSize.value.height
                    = newHeight > maxHeight ? maxHeight
                    : newHeight < minHeight ? minHeight
                    : Math.abs(newHeight - defaultHeight) <= attachRange ? defaultHeight
                    : newHeight
            }
        }
    }

    const mouseUp = () => {
        resizing.value = null
        document.removeEventListener('mousemove', mouseMove)
        document.removeEventListener('mouseup', mouseUp)
    }

    onUnmounted(() => {
        resizing.value = null
        document.removeEventListener('mousemove', mouseMove)
        document.removeEventListener('mouseup', mouseUp)
    })

    return {calloutSize, areaRef, resizeAreaMouseDown, resizing}
}

export function useDataContext(close: () => void) {
    const browserTabs = useBrowserTabs()
    const toast = useToast()
    const dialog = useDialogService()
    const fetchListAll = useFetchHelper(client => client.stagingPost.list)
    const fetchUpdate = usePostFetchHelper(client => client.stagingPost.update)

    const listview = useListViewContext({
        request: client => (offset, limit) => client.stagingPost.list({offset, limit}),
        keyOf: item => item.id,
        eventFilter: {
            filter: ["entity/illust/updated", "entity/illust/deleted", "app/staging-post/changed"],
            operation({ event, refresh, updateKey, removeKey }) {
                if(event.eventType === "entity/illust/updated" && event.illustType === "IMAGE" && event.listUpdated) {
                    updateKey(event.illustId)
                }else if(event.eventType === "entity/illust/deleted" && event.illustType === "IMAGE") {
                    removeKey(event.illustId)
                }else if(event.eventType === "app/staging-post/changed" && (event.added.length || event.deleted.length)) {
                    refresh()
                }
            },
            request: client => async items => mapResponse(await client.illust.findByIds(items.map(i => i.id)), r => r.map(i => i !== null ? i : undefined))
        }
    })

    const createCollection = async () => {
        const items = await fetchListAll({})
        if(items !== undefined && items.total > 0) {
            dialog.creatingCollection.createCollection(items.result.map(i => i.id), (_, newCollection) => {
                toast.toast(newCollection ? "已创建" : "已合并", "success",  newCollection ? "已创建新集合。" : "已将图像合并至指定集合。")
                clear()
            })
        }
    }

    const createBook = async () => {
        const items = await fetchListAll({})
        if(items !== undefined && items.total > 0) {
            dialog.creatingBook.createBook(items.result.map(i => i.id), () => {
                toast.toast("已创建", "success", "已创建新画集。")
                clear()
            })
        }
    }

    const addToFolder = async () => {
        const items = await fetchListAll({})
        if(items !== undefined && items.total > 0) {
            dialog.addToFolder.addToFolder(items.result.map(i => i.id), () => {
                toast.toast("已添加", "success", "已将图像添加到指定目录。")
                clear()
            })
        }
    }

    const clear = () => {
        fetchUpdate({action: "CLEAR"}).finally()
        close()
    }

    const openDetailView = () => {
        browserTabs.newTab({routeName: "StagingPost"})
        close()
    }
    
    return {listview, createCollection, createBook, addToFolder, clear, openDetailView}
}