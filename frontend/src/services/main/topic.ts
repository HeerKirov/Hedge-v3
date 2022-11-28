import { installVirtualViewNavigation } from "@/components/data"
import { useRetrieveHelper } from "@/functions/fetch"
import { flatResponse } from "@/functions/http-client"
import { DetailTopic, TopicQueryFilter } from "@/functions/http-client/api/topic"
import { DetailViewState, useDetailViewState } from "@/services/base/navigation"
import { useListViewContext } from "@/services/base/list-context"
import { usePopupMenu } from "@/modules/popup-menu"
import { useMessageBox } from "@/modules/message-box"
import { installation } from "@/utils/reactivity"

export const [installTopicContext, useTopicContext] = installation(function () {
    const paneState = useDetailViewState<number, Partial<DetailTopic>>()

    const listview = useListView(paneState)

    installVirtualViewNavigation()

    return {paneState, listview}
})

function useListView(paneState: DetailViewState<number, Partial<DetailTopic>>) {
    const message = useMessageBox()

    const list = useListViewContext({
        defaultFilter: <TopicQueryFilter>{order: "-updateTime"},
        request: client => (offset, limit, filter) => client.topic.list({offset, limit, ...filter}),
        eventFilter: {
            filter: ["entity/meta-tag/created", "entity/meta-tag/updated", "entity/meta-tag/deleted"],
            operation({ event, refresh, update, remove }) {
                if(event.eventType === "entity/meta-tag/created" && event.metaType === "TOPIC") {
                    refresh()
                }else if(event.eventType === "entity/meta-tag/updated" && event.metaType === "TOPIC") {
                    update(i => i.id === event.metaId)
                }else if(event.eventType === "entity/meta-tag/deleted" && event.metaType === "TOPIC") {
                    remove(i => i.id === event.metaId)
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.topic.get(a.id))))
        }
    })

    const retrieveHelper = useRetrieveHelper({
        update: client => client.topic.update,
        delete: client => client.topic.delete
    })

    const createByTemplate = (id: number) => {
        const idx = list.listview.proxy.syncOperations.find(a => a.id === id)
        if(idx != undefined) {
            const topic = list.listview.proxy.syncOperations.retrieve(idx)
            paneState.createView(topic)
        }
    }

    const createChildOfTemplate = (id: number) => {
        const idx = list.listview.proxy.syncOperations.find(a => a.id === id)
        if(idx != undefined) {
            const topic = list.listview.proxy.syncOperations.retrieve(idx)
            if(topic !== undefined) {
                paneState.createView({
                    parents: [{
                        id: topic.id,
                        name: topic.name,
                        type: topic.type,
                        color: topic.color
                    }]
                })
            }
        }
    }

    const deleteItem = async (id: number) => {
        if(await message.showYesNoMessage("warn", "确定要删除此项吗？", "此操作不可撤回。")) {
            if(await retrieveHelper.deleteData(id)) {
                if(paneState.isDetailView(id)) paneState.closeView()
            }
        }
    }

    const toggleFavorite = async (topicId: number, favorite: boolean) => {
        await retrieveHelper.setData(topicId, {favorite})
    }

    const popupMenu = usePopupMenu<number>([
        {type: "normal", label: "查看详情", click: paneState.detailView},
        {type: "separator"},
        {type: "normal", label: "新建子主题", click: createChildOfTemplate},
        {type: "normal", label: "以此为模板新建", click: createByTemplate},
        {type: "separator"},
        {type: "normal", label: "删除此主题", click: deleteItem},
    ])

    return {...list, popupMenu, toggleFavorite}
}
