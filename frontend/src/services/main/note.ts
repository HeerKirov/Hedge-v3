import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import { useFetchEndpoint, useFetchHelper, useQueryContinuousListView, useRetrieveHelper } from "@/functions/fetch"
import { NoteRecord, NoteStatus } from "@/functions/http-client/api/note"
import { useQueryNumber } from "@/modules/router"
import { useMessageBox } from "@/modules/message-box"
import { useRouterViewState } from "@/services/base/detail-view-state"
import { computedWatchMutable, installation } from "@/utils/reactivity"
import { flatResponse } from "@/functions/http-client"

export const [installNoteContext, useNoteContext] = installation(function () {
    const paneState = useRouterViewState<number, undefined>(useQueryNumber("Note", "detail"))

    const list = useListView()

    return {paneState, list}
})

function useListView() {
    const message = useMessageBox()
    const { setData, deleteData } = useRetrieveHelper({
        update: client => client.note.update,
        delete: client => client.note.delete
    })

    const filter = ref<"all" | "pin" | "todo" | "completed" | "deleted">("all")
    const status = computed<NoteStatus[] | undefined>(() => filter.value === "all" ? ["PINNED", "GENERAL"] : filter.value === "pin" ? ["PINNED"] : filter.value === "todo" ? ["GENERAL"] : filter.value === "completed" ? ["COMPLETED"] : undefined)

    const listview = useQueryContinuousListView({
        request: client => (offset, limit) => client.note.list({offset, limit, order: ["status", "createTime"], status: status.value, deleted: filter.value === "deleted"}),
        eventFilter: {
            filter: ["entity/note/created", "entity/note/updated", "entity/note/deleted"],
            operation(context) {
                if(context.event.eventType === "entity/note/created" && (filter.value !== "deleted" && status.value?.includes(context.event.status))) {
                    context.reset()
                }else if(context.event.eventType === "entity/note/updated") {
                    const id = context.event.id
                    const ret = listview.data.value.result.find(note => note.id === id)
                    if(ret === undefined) {
                        context.reload()
                    }else if(ret.deleted !== context.event.deleted && (filter.value === "deleted") !== context.event.deleted) {
                        context.remove(i => i.id === id)
                    }else{
                        context.update(i => i.id === id)
                    }
                }else if(context.event.eventType === "entity/note/deleted" && ((filter.value === "deleted" && context.event.deleted) || (filter.value !== "deleted" && status.value?.includes(context.event.status)))) {
                    const id = context.event.id
                    context.remove(i => i.id === id)
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(item => client.note.get(item.id))))
        },
        initSize: 50,
        continueSize: 25
    })

    watch(filter, listview.reset)

    const toggleCompleted = async (item: NoteRecord) => {
        await setData(item.id, {status: item.status === "COMPLETED" ? "GENERAL" : "COMPLETED"})
    }

    const togglePinned = async (item: NoteRecord) => {
        await setData(item.id, {status: item.status === "PINNED" ? "GENERAL" : "PINNED"})
    }

    const resumeItem = async (item: NoteRecord) => {
        await setData(item.id, {deleted: false})
    }

    const deleteItem = async (item: NoteRecord) => {
        if(item.deleted) {
            if(await message.showYesNoMessage("warn", "确定要彻底删除此便签吗？", "此操作不可撤回。")) {
                await deleteData(item.id)
            }
        }else{
            await setData(item.id, {deleted: true})
        }
    }

    return {filter, listview, toggleCompleted, togglePinned, resumeItem, deleteItem}
}

export function useNoteDetailContext() {
    const message = useMessageBox()
    const { paneState } = useNoteContext()

    const createFetch = useFetchHelper(client => client.note.create)

    const { data, setData, deleteData } = useFetchEndpoint({
        path: paneState.detailPath,
        get: client => client.note.get,
        update: client => client.note.update,
        delete: client => client.note.delete
    })

    const form = computedWatchMutable(data, () => ({
        completed: data.value?.status === "COMPLETED" ?? false,
        pinned: data.value?.status === "PINNED" ?? false,
        title: data.value?.title ?? "",
        content: data.value?.content ?? "",
        changed: false
    }))    

    const submit = async () => {
        if(paneState.mode.value === "create") {
            if(form.value.title || form.value.content) {
                const res = await createFetch({title: form.value.title, content: form.value.content, status: form.value.pinned ? "PINNED" : form.value.completed ? "COMPLETED" : "GENERAL"})
                if(res !== undefined && paneState.mode.value === "create") {
                    paneState.openDetailView(res.id)
                }
            }
        }else if(paneState.mode.value === "detail") {
            const status = form.value.pinned ? "PINNED" : form.value.completed ? "COMPLETED" : "GENERAL"
            if(data.value !== null && (status !== data.value.status || form.value.title !== data.value.title || form.value.content !== data.value.content)) {
                await setData({title: form.value.title !== data.value.title ? form.value.title : undefined, content: form.value.content !== data.value.content ? form.value.content : undefined, status: status !== data.value.status ? status : undefined})
            }
        }
    }

    const setTitle = (title: string) => {
        form.value.title = title
    }

    const setContent = (content: string) => {
        form.value.content = content
    }

    const togglePinned = () => {
        form.value.pinned = !form.value.pinned
        submit()
    }

    const toggleCompleted = () => {
        form.value.completed = !form.value.completed
        submit()
    }

    const deleteItem = async () => {
        if(data.value !== null) {
            if(data.value.deleted) {
                if(await message.showYesNoMessage("warn", "确定要彻底删除此便签吗？", "此操作不可撤回。")) {
                    if(await deleteData()) {
                        paneState.closeView()
                    }
                }
            }else{
                if(await setData({deleted: true})) {
                    paneState.closeView()
                }
            }
        }
    }

    onMounted(() => window.addEventListener("beforeunload", submit))
    onUnmounted(() => window.removeEventListener("beforeunload", submit))

    return {paneState, form, setTitle, setContent, submit, toggleCompleted, togglePinned, deleteItem}
}