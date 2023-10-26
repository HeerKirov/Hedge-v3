import { Ref, computed, ref, shallowRef, unref, watch } from "vue"
import { VirtualViewNavigation } from "@/components/data"
import {
    PaginationDataView, QueryListview, AllSlice, ListIndexSlice, SingletonSlice,
    usePostFetchHelper, usePostPathFetchHelper, useFetchHelper, QueryInstance, createMappedQueryInstance, PaginationData
} from "@/functions/fetch"
import { DraggingIllust, CommonIllust, Illust, IllustQueryFilter } from "@/functions/http-client/api/illust"
import { QueryRes } from "@/functions/http-client/api/util-query"
import { Folder } from "@/functions/http-client/api/folder"
import { Book } from "@/functions/http-client/api/book"
import { IllustViewController } from "@/services/base/view-controller"
import { SelectedState } from "@/services/base/selected-state"
import { useHomepageState } from "@/services/main/homepage"
import { useToast } from "@/modules/toast"
import { useMessageBox } from "@/modules/message-box"
import { useRouterNavigator } from "@/modules/router"
import { useDialogService } from "@/components-module/dialog"
import { useViewStack } from "@/components-module/view-stack"
import { usePreviewService } from "@/components-module/preview"
import { installation } from "@/utils/reactivity"
import { LocalDate, LocalDateTime, datetime } from "@/utils/datetime"

export interface ImageDatasetOperatorsOptions<T extends CommonIllust> {
    /**
     * data view.
     */
    paginationData: PaginationDataView<T>
    /**
     * endpoint.
     */
    listview: QueryListview<T>
    /**
     * 视图控制器。preview功能需要它们。
     */
    listviewController: IllustViewController
    /**
     * 已选择项。
     */
    selector: SelectedState<number>
    /**
     * 滚动视图导航器。
     */
    navigation: VirtualViewNavigation
    /**
     * 创建切片视图时，使用此方法执行类型映射。当T的类型不满足覆盖Illust类型时，需要使用此方法，将数据映射到Illust类型上。
     * @param instance
     */
    mapSlice?: (item: T) => Illust
    /**
     * 为{createCollection}提供更多选项参数。
     */
    createCollection?: {
        /**
         * 如果可能，跳过对话框以确认。(即如果image无冲突，调用会直接创建集合而不会打开对话框)
         */
        skipDialogIfAllow?: boolean
    }
    /**
     * 激活dataDrop操作，并提供更多参数。
     */
    dataDrop?: {
        /**
         * 拖放区域的类型为图库。此时，拖放操作会将illusts的排序时间插入到目标位置。
         */
        dropInType: "illust"
        /**
         * 查询schema。用于辅助判断排序方向。
         */
        querySchema: Ref<QueryRes | null>
        /**
         * 查询过滤条件。用于辅助判断排序方向。
         */
        queryFilter: Ref<IllustQueryFilter>
    } | {
        /**
         * 拖放区域的类型为分区。此时，拖放操作会将illusts的排序时间插入到目标位置，还会额外将分区时间设置为目标分区。
         */
        dropInType: "partition"
        /**
         * 分区的日期。
         */
        path: LocalDate | Ref<LocalDate | null>
        /**
         * 查询schema。用于辅助判断排序方向。
         */
        querySchema: Ref<QueryRes | null>
        /**
         * 查询过滤条件。用于辅助判断排序方向。
         */
        queryFilter: Ref<IllustQueryFilter>
    } | {
        /**
         * 拖放区域的类型为集合、画集、文件夹。此时，拖放操作会将illusts插入目标对象。
         */
        dropInType: "collection" | "book" | "folder"
        /**
         * 集合、画集、文件夹的id。
         */
        path: number | Ref<number | null>
    }
}

export interface ImageDatasetOperators<T extends CommonIllust> {
    /**
     * 通过双击的方式打开详情页。
     * @param illustId illust id
     * @param openCollection 如果目标是集合，那么打开集合。
     */
    openDetailByClick(illustId: number, openCollection?: boolean): void
    /**
     * 通过选中回车的方式打开详情页。处理方式大致相同，不过没有openCollection模式，且在选中多项时从头开始浏览。
     * @param illustId
     */
    openDetailByEnter(illustId: number): void
    /**
     * 直接打开集合详情页。
     */
    openCollectionDetail(illustId: number): void
    /**
     * 在新窗口打开此项目。
     * @param illust
     */
    openInNewWindow(illust: T): void
    /**
     * 通过选中空格的方式打开预览。未指定参数时，它总是预览最后选中项；指定参数时，则尝试预览指定项。
     * @param illustId 
     */
    openPreviewBySpace(illust?: T): void
    /**
     * 更改favorite属性。
     */
    modifyFavorite(illust: T, favorite: boolean): void
    /**
     * 创建集合。选用的items列表是已选择项加上当前目标项。
     * 如果选择的项中存在集合，或存在已属于其他集合的图像，那么打开一个对话框以供判别。
     * - forceDialog: 无论有没有冲突，都打开对话框。
     * - refreshWhenCreated: 创建成功后，刷新endpoint。
     */
    createCollection(illust: T): void
    /**
     * 从当前集合中拆分出选择项来生成新集合。应该在集合详情页的列表中替代{createCollection}来调用。
     * 因为总是从现有集合中选取数据，因此它的作用是从现有集合拆分出一个新集合。
     */
    splitToGenerateNewCollection(illust: T): void
    /**
     * 创建book。打开一个对话框，以供编辑项列表和填写基本信息。
     */
    createBook(illust: T): void
    /**
     * 编辑关联组。打开一个对话框，以供编辑当前项的关联组信息。
     * 关联组是不能群体设置的。当选择多个项一同编辑时，会将点击项作为主体，其他选择项作为追加对象。
     */
    editAssociate(illust: T): void
    /**
     * 添加到目录。打开一个对话框，以选择要添加到的目录。
     * @param illust
     */
    addToFolder(illust: T): void
    /**
     * 打开对话框，执行属性克隆操作。将选择项放入from和to。
     */
    cloneImage(illust: T): void
    /**
     * 删除项目。会先打开对话框确认。
     */
    deleteItem(illust: T): void
    /**
     * 导出项目。这会打开导出对话框。
     */
    exportItem(illust: T): void
    /**
     * 将项目加入暂存区。
     */
    addToStagingPost(illust: T): void
    /**
     * 从暂存区pop所有数据，插入到选择的指定位置。效果相当于dataDrop，因此要求提供dataDtop options参数。
     */
    popStagingPost(illust: T, position?: "before" | "after"): void
    /**
     * 将项目从其所属的collection中移除。会先打开对话框确认。
     * @param illust
     */
    removeItemFromCollection(illust: T): void
    /**
     * 将项目从指定的book中移除。会先打开对话框确认。
     * @param illust
     * @param bookId
     */
    removeItemFromBook(illust: T, bookId: number): void
    /**
     * 将项目从指定的folder中移除。会先打开对话框确认。
     * @param illust
     * @param folderId
     */
    removeItemFromFolder(illust: T, folderId: number): void
    /**
     * 提供数据插入操作，适用于将illusts拖曳到Dataset时的添加操作。
     * 依据options配置的不同，展开不同种类的添加操作。
     */
    dataDrop(insertIndex: number | null, illusts: DraggingIllust[], mode: "ADD" | "MOVE"): void
    /**
     * 获得当前操作中，应该受到影响的对象id列表。此方法被提供给外部实现的其他函数，用于和context内的选择行为统一。
     * 选择行为指：当存在选中项时，在选择项之外右键将仅使用右键项而不包括选择项。它需要影响那些有多项目操作的行为。
     */
    getEffectedItems(illust: T): number[]
    /**
     * 暂存区内容数量，用于判定pop staging post功能是否可用。
     */
    stagingPostCount: Readonly<Ref<number>>
}

/**
 * 提供一组综合的operators，在Illust列表相关的位置使用。
 * Illust列表在多处有不同的实现，而他们的operators又有大量重复和相似之处。
 */
export function useImageDatasetOperators<T extends CommonIllust>(options: ImageDatasetOperatorsOptions<T>): ImageDatasetOperators<T> {
    const toast = useToast()
    const message = useMessageBox()
    const navigator = useRouterNavigator()
    const dialog = useDialogService()
    const viewStack = useViewStack()
    const preview = usePreviewService()
    const { paginationData, listview, listviewController, navigation, selector, dataDrop: dataDropOptions, createCollection: createCollectionOptions } = options

    const fetchIllustUpdate = usePostPathFetchHelper(client => client.illust.update)
    const fetchIllustDelete = usePostFetchHelper(client => client.illust.delete)
    const fetchCollectionCreate = useFetchHelper(client => client.illust.collection.create)
    const fetchImageRelatedUpdate = usePostPathFetchHelper(client => client.illust.image.relatedItems.update)
    const fetchBookImagesPartialUpdate = usePostPathFetchHelper(client => client.book.images.partialUpdate)
    const fetchFolderImagesPartialUpdate = usePostPathFetchHelper(client => client.folder.images.partialUpdate)
    const fetchStagingPostListAll = useFetchHelper(client => client.stagingPost.list)
    const fetchStagingPostUpdate = usePostFetchHelper(client => client.stagingPost.update)

    const homepageState = dataDropOptions === undefined ? null : useHomepageState()

    const getEffectedItems = (illust: T): number[] => {
        return selector.selected.value.includes(illust.id) ? selector.selected.value : [illust.id]
    }

    const getSliceInstance = (): QueryInstance<Illust> => {
        if(options.mapSlice) {
            return createMappedQueryInstance(listview.instance.value, options.mapSlice)
        }else{
            return listview.instance.value as unknown as QueryInstance<Illust>
        }
    }

    const openAll = (illustId: number) => {
        const currentIndex = paginationData.proxy.syncOperations.find(i => i.id === illustId)
        if(currentIndex !== undefined) {
            const slice: AllSlice<Illust> = {type: "ALL", focusIndex: currentIndex, instance: getSliceInstance()}
            viewStack.openImageView(slice, illustId => {
                //回调：给出了目标id，回查data的此项，并找到此项现在的位置，导航到此位置
                const index = paginationData.proxy.syncOperations.find(i => i.id === illustId)
                if(index !== undefined) {
                    selector.update([illustId], illustId)
                    navigation.navigateTo(index)
                }
            })
        }
    }

    const openList = (selected: number[], currentIndex: number) => {
        const indexList = selected
            .map(selectedId => paginationData.proxy.syncOperations.find(i => i.id === selectedId))
            .filter(index => index !== undefined) as number[]
        const slice: ListIndexSlice<Illust> = {type: "LIST", indexes: indexList, focusIndex: currentIndex, instance: getSliceInstance()}
        viewStack.openImageView(slice, illustId => {
            //回调：给出了目标id，回查data的此项，并找到此项现在的位置，导航到此位置
            const index = paginationData.proxy.syncOperations.find(i => i.id === illustId)
            if(index !== undefined) navigation.navigateTo(index)
        })
    }

    const openDetailByClick = (illustId: number, openCollection?: boolean) => {
        if(openCollection) {
            //在按下option/alt键时，打开集合
            const index = paginationData.proxy.syncOperations.find(i => i.id === illustId)
            if(index !== undefined) {
                const illust = paginationData.proxy.syncOperations.retrieve(index)!
                if(illust.type === "COLLECTION") {
                    const slice: SingletonSlice<Illust> = {type: "SINGLETON", index, instance: getSliceInstance()}
                    viewStack.openCollectionView(slice)
                    return
                }
            }
        }
        if(selector.selected.value.length > 1) {
            //选择项数量大于1时，只显示选择项列表
            const currentIndex = selector.selected.value.indexOf(illustId)
            if(currentIndex <= -1) {
                //特殊情况：在选择项之外的项上右键选择了预览。此时仍按全局显示
                openAll(illustId)
            }else{
                openList(selector.selected.value, currentIndex)
            }
        }else{
            //否则显示全局
            openAll(illustId)
        }
    }

    const openDetailByEnter = (illustId: number) => {
        if(selector.selected.value.length > 1) {
            //选择项数量大于1时，只显示选择项列表，且进入模式是enter进入，默认不指定选择项，从头开始浏览
            openList(selector.selected.value, 0)
        }else{
            //否则显示全局
            openAll(illustId)
        }
    }

    const openCollectionDetail = (illustId: number) => {
        const currentIndex = paginationData.proxy.syncOperations.find(i => i.id === illustId)
        if(currentIndex !== undefined) {
            const illust = paginationData.proxy.syncOperations.retrieve(currentIndex)!
            if(illust.type === "COLLECTION") {
                const slice: SingletonSlice<Illust> = {type: "SINGLETON", index: currentIndex, instance: getSliceInstance()}
                viewStack.openCollectionView(slice)
            }else{
                console.error(`Illust ${illust.id} is not a collection.`)
            }
        }
    }

    const openInNewWindow = (illust: T) => {
        if(illust.type === "COLLECTION") {
            navigator.newPreviewWindow({type: "collection", collectionId: illust.id})
        }else{
            const imageIds = getEffectedItems(illust)
            const currentIndex = imageIds.indexOf(illust.id)
            navigator.newPreviewWindow({type: "image", imageIds, currentIndex})
        }
    }

    const openPreviewBySpace = (illust?: T) => {
        if(illust !== undefined) {
            //如果指定项已选中，那么将最后选中项重新指定为指定项；如果未选中，那么将单独选中此项
            if(selector.selected.value.includes(illust.id)) {
                selector.update(selector.selected.value, illust.id)
            }else{
                selector.update([illust.id], illust.id)
            }
        }
        preview.show({
            preview: "image", 
            type: "listview", 
            listview: listview,
            paginationData: paginationData.data,
            columnNum: listviewController.columnNum,
            viewMode: listviewController.viewMode,
            selected: selector.selected,
            lastSelected: selector.lastSelected,
            updateSelect: selector.update
        })
    }

    const modifyFavorite = async (illust: T, favorite: boolean) => {
        const items = getEffectedItems(illust)
        for (const itemId of items) {
            fetchIllustUpdate(itemId, { favorite }).finally()
        }
    }

    const createCollection = (illust: T) => {
        const items = getEffectedItems(illust)
        const onCreated = (_: number, newCollection: boolean) => {
            toast.toast(newCollection ? "已创建" : "已合并", "success",  newCollection ? "已创建新集合。" : "已将图像合并至指定集合。")
        }

        dialog.creatingCollection.createCollection(items, onCreated, createCollectionOptions?.skipDialogIfAllow)
    }

    const splitToGenerateNewCollection = async (illust: T) => {
        if(await message.showYesNoMessage("confirm", "确定要拆分生成新的集合吗？", "这些项将从当前集合中移除。")) {
            const images = selector.selected.value.length > 0 ? [...selector.selected.value] : [illust.id]
            const res = await fetchCollectionCreate({images})
            if(res !== undefined) {
                //创建成功后打开新集合的详情页面
                viewStack.openCollectionView(res.id)
            }
        }
    }

    const createBook = (illust: T) => {
        const items = getEffectedItems(illust)
        dialog.creatingBook.createBook(items, () => toast.toast("已创建", "success", "已创建新画集。"))
    }

    const editAssociate = (illust: T) => {
        const items = getEffectedItems(illust)
        const appendIds = items.filter(id => id !== illust.id)
        dialog.associateExplorer.editAssociate(illust.id, appendIds, "append", () => toast.toast("已编辑", "success", "已编辑关联组。"))
    }

    const addToFolder = (illust: T) => {
        const items = getEffectedItems(illust)
        dialog.addToFolder.addToFolder(items, () => toast.toast("已添加", "success", "已将图像添加到指定目录。"))
    }

    const deleteItem = async (illust: T) => {
        if(selector.selected.value.length === 0 || !selector.selected.value.includes(illust.id)) {
            if(illust.type === "COLLECTION") {
                if(await message.showYesNoMessage("warn", "确定要删除此集合吗？集合内的图像不会被删除。", "此操作不可撤回。")) {
                    await fetchIllustDelete(illust.id)
                }
            }else{
                if(await message.showYesNoMessage("warn", "确定要删除此项吗？", "被删除的项将放入「已删除」归档。")) {
                    await fetchIllustDelete(illust.id)
                }
            }
        }else{
            const items = getEffectedItems(illust)
            if(await message.showYesNoMessage("warn", `确定要删除${items.length}个已选择项吗？`, "集合内的图像不会被删除。被删除的项将放入「已删除」归档。")) {
                for (const id of items) {
                    fetchIllustDelete(id).finally()
                }
            }
        }
    }

    const cloneImage = async (illust: T) => {
        const items = getEffectedItems(illust)
        if(items.length > 2) {
            toast.toast("选择项过多", "warning", "选择项过多。属性克隆中，请使用1或2个选择项。")
            return
        }
        dialog.cloneImage.clone({from: items[0], to: items.length >= 2 ? items[1] : undefined}, (_, __, deleted) => {
            if(deleted) {
                toast.toast("完成", "success", "已完成属性克隆。源图像已删除。")
            }else{
                toast.toast("完成", "success", "已完成属性克隆。")
            }
        })
    }

    const addToStagingPost = async (illust: T) => {
        const images = getEffectedItems(illust)
        await fetchStagingPostUpdate({action: "ADD", images})
    }

    const popStagingPost = dataDropOptions === undefined ? () => {} : async (illust: T, position: "before" | "after" = "after") => {
        const idx = paginationData.proxy.syncOperations.find(i => i.id === illust.id)
        if(idx !== undefined) {
            const res = await fetchStagingPostListAll({})
            if(res !== undefined) {
                const ok = await dataDrop(position === "before" ? idx : idx + 1, res.result.map(i => ({id: i.id, filePath: i.filePath, type: "IMAGE", childrenCount: null, orderTime: i.orderTime, favorite: i.favorite, score: i.score, source: i.source})), "ADD")
                if(ok) {
                    await fetchStagingPostUpdate({action: "CLEAR"})
                }
            }
        }
    }

    const exportItem = (illust: T) => {
        const itemIds = getEffectedItems(illust)
        dialog.externalExporter.export("ILLUST", itemIds)
    }

    const removeItemFromCollection = async (illust: T) => {
        const images = getEffectedItems(illust)
        if(await message.showYesNoMessage("warn", `确定要从集合移除${images.length > 1 ? "这些" : "此"}项吗？`)) {
            await Promise.all(images.map(illustId => fetchImageRelatedUpdate(illustId, {collectionId: null})))
        }
    }

    const removeItemFromBook = async (illust: T, bookId: number) => {
        const images = getEffectedItems(illust)
        if(await message.showYesNoMessage("warn", `确定要从画集移除${images.length > 1 ? "这些" : "此"}项吗？`)) {
            await fetchBookImagesPartialUpdate(bookId, {action: "DELETE", images})
        }
    }

    const removeItemFromFolder = async (illust: T, folderId: number) => {
        const images = getEffectedItems(illust)
        if(await message.showYesNoMessage("warn", `确定要从目录移除${images.length > 1 ? "这些" : "此"}项吗？`)) {
            await fetchFolderImagesPartialUpdate(folderId, {action: "DELETE", images})
        }
    }

    const dataDrop = useDataDrop(dataDropOptions, paginationData)

    const stagingPostCount = homepageState ? computed(() => homepageState.data.value?.stagingPostCount ?? 0) : shallowRef(0)

    return {
        openDetailByClick, openDetailByEnter, openCollectionDetail, openInNewWindow, openPreviewBySpace, modifyFavorite,
        createCollection, splitToGenerateNewCollection, createBook, editAssociate, addToFolder, 
        cloneImage, exportItem, addToStagingPost, popStagingPost, stagingPostCount,
        deleteItem, removeItemFromCollection, removeItemFromBook, removeItemFromFolder, getEffectedItems, dataDrop
    }
}

function useDataDrop<T extends CommonIllust>(dataDropOptions: ImageDatasetOperatorsOptions<T>["dataDrop"], paginationData: PaginationDataView<T>) {
    if(dataDropOptions !== undefined) {
        const dialog = useDialogService()

        const fetchIllustBatchUpdate = usePostFetchHelper(client => client.illust.batchUpdate)
        const fetchCollectionImagesUpdate = usePostPathFetchHelper(client => client.illust.collection.images.update)
        const fetchBookImagesPartialUpdate = usePostPathFetchHelper(client => client.book.images.partialUpdate)
        const fetchFolderImagesPartialUpdate = usePostPathFetchHelper(client => client.folder.images.partialUpdate)

        const getCurrentOrderDirection = (): "asc" | "desc" => {
            if(dataDropOptions.dropInType === "illust" || dataDropOptions.dropInType === "partition") {
                if(dataDropOptions.querySchema.value?.queryPlan?.orders.length) {
                    //如果存在query schema查询计划，优先从中提取有关orderTime的排序信息。orderTime的排序字段名是ORDINAL，视情况在前面添加+/-
                    const ordinalOrderValue = dataDropOptions.querySchema.value.queryPlan.orders.find(i => i.endsWith("ORDINAL"))
                    if(ordinalOrderValue) {
                        return ordinalOrderValue.startsWith("-") ? "desc" : "asc"
                    }
                }
                if(dataDropOptions.queryFilter.value.order?.length) {
                    if(typeof dataDropOptions.queryFilter.value.order === "object") {
                        const orderValue = dataDropOptions.queryFilter.value.order.find(i => i.endsWith("orderTime"))
                        if(orderValue) {
                            return orderValue.startsWith("-") ? "desc" : "asc"
                        }
                    }else if(dataDropOptions.queryFilter.value.order.endsWith("orderTime")) {
                        return dataDropOptions.queryFilter.value.order.startsWith("-") ? "desc" : "asc"
                    }
                }
            }
            return "asc"
        }

        const insertIntoIllusts = async (insertIndex: number | null, illusts: DraggingIllust[], _: "ADD" | "MOVE"): Promise<boolean> => {
            const target = illusts.map(i => i.id)
            const partitionTime = dataDropOptions.dropInType === "partition" ? unref(dataDropOptions.path) ?? undefined : undefined
            const finalInsertIndex = insertIndex ?? paginationData.proxy.syncOperations.count()
            if(finalInsertIndex === 0) {
                const afterItem = paginationData.proxy.syncOperations.retrieve(finalInsertIndex)!
                const timeInsertAt = getCurrentOrderDirection() === "asc" ? "behind" : "after"
                await fetchIllustBatchUpdate({target, timeInsertBegin: afterItem.id, timeInsertAt, orderTimeExclude: true, partitionTime})
                return true
            }else if(finalInsertIndex !== null && finalInsertIndex === paginationData.proxy.syncOperations.count()) {
                const behindItem = paginationData.proxy.syncOperations.retrieve(finalInsertIndex - 1)!
                const timeInsertAt = getCurrentOrderDirection() === "asc" ? "after" : "behind"
                await fetchIllustBatchUpdate({target, timeInsertBegin: behindItem.id, timeInsertAt, orderTimeExclude: true, partitionTime})
                return true
            }else if(finalInsertIndex !== null) {
                const behindItem = paginationData.proxy.syncOperations.retrieve(finalInsertIndex - 1)!
                const afterItem = paginationData.proxy.syncOperations.retrieve(finalInsertIndex)!
                await fetchIllustBatchUpdate({target, timeInsertBegin: behindItem.id, timeInsertEnd: afterItem.id, partitionTime})
                return true
            }
            return false
        }

        if(dataDropOptions.dropInType === "illust" || dataDropOptions.dropInType === "partition") {
            return insertIntoIllusts
        }else if(dataDropOptions.dropInType === "collection") {
            return async (insertIndex: number | null, illusts: DraggingIllust[], mode: "ADD" | "MOVE"): Promise<boolean> => {
                const path = unref(dataDropOptions.path)
                if(path !== null) {
                    if(mode === "ADD") {
                        const images = await dialog.addIllust.checkExistsInCollection(illusts.map(i => i.id), path)
                        if(images !== undefined && images.length > 0) {
                            //在ADD时并不会更改排序，要想在集合中更改排序只能是MOVE操作。这种设计适合只是想将项加入集合而不想重排序的情况。
                            return await fetchCollectionImagesUpdate(path, [path, ...images])
                        }
                    }else{
                        return await insertIntoIllusts(insertIndex, illusts, "MOVE")
                    }
                }
                return false
            }
        }else if(dataDropOptions.dropInType === "book") {
            return async (insertIndex: number | null, illusts: DraggingIllust[], mode: "ADD" | "MOVE"): Promise<boolean> => {
                const path = unref(dataDropOptions.path)
                if(path !== null) {
                    if(mode === "ADD") {
                        const images = await dialog.addIllust.checkExistsInBook(illusts.map(i => i.id), path)
                        if(images !== undefined && images.length > 0) {
                            return await fetchBookImagesPartialUpdate(path, {action: "ADD", images, ordinal: insertIndex})
                        }
                    }else if(illusts.length > 0) {
                        //移动操作直接调用API即可，不需要检查
                        return await fetchBookImagesPartialUpdate(path, {action: "MOVE", images: illusts.map(i => i.id), ordinal: insertIndex})
                    }
                }
                return false
            }
        }else if(dataDropOptions.dropInType === "folder") {
            return async (insertIndex: number | null, illusts: DraggingIllust[], mode: "ADD" | "MOVE"): Promise<boolean> => {
                const path = unref(dataDropOptions.path)
                if(path !== null) {
                    if(mode === "ADD") {
                        const images = await dialog.addIllust.checkExistsInFolder(illusts.map(i => i.id), path)
                        if(images !== undefined && images.length > 0) {
                            return await fetchFolderImagesPartialUpdate(path, {action: "ADD", images, ordinal: insertIndex})
                        }
                    }else if(illusts.length > 0) {
                        //移动操作直接调用API即可，不需要检查
                        return await fetchFolderImagesPartialUpdate(path, {action: "MOVE", images: illusts.map(i => i.id), ordinal: insertIndex})
                    }
                }
                return false
            }
        }
    }
    return () => {}
}

interface LocateIdOptions<T extends CommonIllust> {
    queryFilter: Ref<IllustQueryFilter>
    paginationData: PaginationDataView<T>
    selector: SelectedState<number>
    navigation: VirtualViewNavigation
}

/**
 * 提供一组有关locateId的实现。
 */
export function useLocateId<T extends CommonIllust>(options: LocateIdOptions<T>) {
    const locateId = ref<number | null>()
    const fetchFindLocation = useFetchHelper(client => client.illust.findLocation)
    
    watch(() => [options.paginationData.data.metrics.total, locateId.value] as const, async ([total, id]) => {
        if(total && id) {
            const res = await fetchFindLocation({
                ...options.queryFilter.value,
                imageId: id
            })
            if(res !== undefined) {
                options.selector.update([res.id], res.id)
                if(res.index >= 0) options.navigation.navigateTo(res.index)
            }
            locateId.value = null
        }
    })

    const catchLocateId = (newLocateId: number | null | undefined) => {
        if(newLocateId) {
            locateId.value = newLocateId
        }
    }

    return {catchLocateId}
}

interface IllustListviewContextOptions {
    listview: {
        listview: QueryListview<CommonIllust>
        paginationData: PaginationDataView<CommonIllust>
    }
    selector: SelectedState<number>
    listviewController: {
        columnNum: Ref<number>
        viewMode: Ref<"grid" | "row">
    }
    book?: Readonly<Ref<number | Book | null>>
    folder?: Readonly<Ref<number | Folder | null>>
}

/**
 * 提供Illust列表Listview相关的上下文。它按照CommonIllust通用结构安装，被详情页选项卡和预览弹窗引用。
 */
export const [installIllustListviewContext, useIllustListviewContext] = installation(function(options: IllustListviewContextOptions) {
    return options
})