import { ref, watch } from "vue"
import { useCreatingHelper, usePaginationDataView, useQueryListview } from "@/functions/fetch"
import { TaskConfig, TaskSelector } from "@/functions/http-client/api/find-similar"
import { useSettingFindSimilar } from "@/services/setting"
import { useToast } from "@/modules/toast"
import { Push } from "../context"

export interface FindSimilarTaskExplorer {
    /**
     * 打开创建任务的面板。
     */
    create(): void
    /**
     * 打开队列列表面板。
     */
    list(): void
}

export type FindSimilarTaskExplorerProps = {
    mode: "create" | "list"
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
    }
}

export function useTaskListData() {
    const listview = useQueryListview({
        request: client => (offset, limit, _) => client.findSimilar.task.list({offset, limit, order: "+recordTime"}),
        eventFilter: {
            filter: ["entity/find-similar-result/created"],
            operation(context) {
                context.refresh()
            }
        }
    })

    const paginationData = usePaginationDataView(listview)

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