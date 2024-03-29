import { onMounted, ref, watch } from "vue"
import {
    useCreatingHelper,
    useFetchEndpoint,
    useFetchHelper,
    usePaginationDataView,
    useQueryListview
} from "@/functions/fetch"
import { TaskConfig, TaskSelector } from "@/functions/http-client/api/find-similar"
import { useSettingFindSimilar } from "@/services/setting"
import { useToast } from "@/modules/toast"
import { Push } from "../context"
import { useBrowserTabs } from "@/modules/browser";

export interface FindSimilarTaskExplorer {
    /**
     * 打开创建任务的面板。
     */
    create(): void
    /**
     * 打开队列列表面板。
     */
    list(): void
    /**
     * 发起一次速查。
     */
    quickFind(illusts: number[]): void
}

export type FindSimilarTaskExplorerProps = {
    mode: "create" | "list"
} | {
    mode: "quickFind"
    illusts: number[]
}

export function useFindSimilarTaskExplorer(push: Push): FindSimilarTaskExplorer {
    return {
        create() {
            push({
                type: "findSimilarTaskExplorer",
                props: {mode: "create"}
            })
        },
        list() {
            push({
                type: "findSimilarTaskExplorer",
                props: {mode: "list"}
            })
        },
        quickFind(illusts: number[]) {
            push({
                type: "findSimilarTaskExplorer",
                props: {mode: "quickFind", illusts}
            })
        }
    }
}

export function useQuickFindData(illusts: number[], close: () => void) {
    const browserTabs = useBrowserTabs()
    const fetchCreate = useFetchHelper(client => client.findSimilar.quickFind.create)

    const path = ref<number | null>(null)

    const { data } = useFetchEndpoint({
        path,
        get: client => client.findSimilar.quickFind.get,
        eventFilter: c => event => event.eventType === "app/quick-find/changed" && event.id === c.path
    })

    onMounted(async () => {
        const res = await fetchCreate(illusts)
        if(res !== undefined) path.value = res.id
    })

    const openInNewTab = () => {
        browserTabs.newTab({routeName: "QuickFindDetail", path: path.value})
        close()
    }

    const openInNewWindow = () => browserTabs.newWindow({routeName: "QuickFindDetail", path: path.value})

    return {path, data, openInNewTab, openInNewWindow}
}

export function useTaskListData() {
    const listview = useQueryListview({
        request: client => (offset, limit, _) => client.findSimilar.task.list({offset, limit, order: "+recordTime"}),
        keyOf: item => item.id,
        eventFilter: {
            filter: ["entity/find-similar-result/created"],
            operation(context) {
                context.refresh()
            }
        }
    })

    const paginationData = usePaginationDataView({listview, bufferPercent: 0.2})

    return {listview, paginationData}
}

export function useTaskCreatorData(close: () => void) {
    const toast = useToast()
    const setting = useSettingFindSimilar()
    
    const form = ref<TaskCreatorForm>(createDefaultForm())

    const { submit } = useCreatingHelper({
        form,
        mapForm: f => f,
        create: client => client.findSimilar.task.create,
        afterCreate() {
            toast.toast("已创建", "success", "相似项查找任务已创建完成。")
            close()
        }
    })

    watch(setting.data, setting => {
        if(setting !== undefined) {
            form.value.config = {...setting.defaultTaskConf}
        }
    }, {immediate: true})

    return {form, submit, setting}
}

function createDefaultForm(): TaskCreatorForm {
    return {
        selector: {type: "image", imageIds: []}, 
        config: {
            filterByAuthor: false, filterByPartition: false, filterBySourceTagType: [], filterByTopic: false, 
            findBySimilarity: false, findBySourceIdentity: false, findBySourceRelation: false, findBySourcePart: false, findBySourceBook: false, 
            filterBySourceBook: false, filterBySourcePart: false, filterBySourceRelation: false, filterInCurrentScope: false
        }
    }
}

interface TaskCreatorForm {
    selector: TaskSelector
    config: TaskConfig
}