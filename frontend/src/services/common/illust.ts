import { Ref, ref, unref, watch } from "vue"
import { VirtualViewNavigation } from "@/components/data"
import {
    PaginationDataView, QueryListview, AllSlice, ListIndexSlice, SingletonSlice,
    usePostFetchHelper, usePostPathFetchHelper, useFetchHelper, QueryInstance, createMappedQueryInstance, PaginationData
} from "@/functions/fetch"
import { CoverIllust, Illust, IllustQueryFilter, IllustType } from "@/functions/http-client/api/illust"
import { SelectedState } from "@/services/base/selected-state"
import { useToast } from "@/modules/toast"
import { useMessageBox } from "@/modules/message-box"
import { useRouterNavigator } from "@/modules/router"
import { useDialogService } from "@/components-module/dialog"
import { useViewStack } from "@/components-module/view-stack"
import { LocalDateTime } from "@/utils/datetime"

export interface ImageDatasetOperatorsOptions<T extends BasicIllust> {
    /**
     * data view.
     */
    paginationData: PaginationDataView<T>
    /**
     * endpoint.
     */
    listview: QueryListview<T>
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
         * 拖放区域的类型为图库、分区。此时，拖放操作会将illusts的排序时间插入到目标位置。分区还会额外将分区时间设置为目标分区。
         */
        dropInType: "illust" | "partition"
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

export interface ImageDatasetOperators<T extends BasicIllust> {
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
    dataDrop(insertIndex: number | null, illusts: CoverIllust[], mode: "ADD" | "MOVE"): void
    /**
     * 获得当前操作中，应该受到影响的对象id列表。此方法被提供给外部实现的其他函数，用于和context内的选择行为统一。
     * 选择行为指：当存在选中项时，在选择项之外右键将仅使用右键项而不包括选择项。它需要影响那些有多项目操作的行为。
     */
    getEffectedItems(illust: T): number[]
}

interface BasicIllust { id: number, type?: IllustType, file: string, thumbnailFile: string, orderTime: LocalDateTime }

/**
 * 提供一组综合的operators，在Illust列表相关的位置使用。
 * Illust列表在多处有不同的实现，而他们的operators又有大量重复和相似之处。
 */
export function useImageDatasetOperators<T extends BasicIllust>(options: ImageDatasetOperatorsOptions<T>): ImageDatasetOperators<T> {
    const toast = useToast()
    const message = useMessageBox()
    const navigator = useRouterNavigator()
    const dialog = useDialogService()
    const viewStack = useViewStack()
    const { paginationData, listview, navigation, selector, dataDrop: dataDropOptions, createCollection: createCollectionOptions } = options

    const fetchIllustUpdate = usePostPathFetchHelper(client => client.illust.update)
    const fetchIllustDelete = usePostFetchHelper(client => client.illust.delete)
    const fetchCollectionCreate = useFetchHelper(client => client.illust.collection.create)
    const fetchImageRelatedUpdate = usePostPathFetchHelper(client => client.illust.image.relatedItems.update)
    const fetchCollectionImagesUpdate = usePostPathFetchHelper(client => client.illust.collection.images.update)
    const fetchBookImagesPartialUpdate = usePostPathFetchHelper(client => client.book.images.partialUpdate)
    const fetchFolderImagesPartialUpdate = usePostPathFetchHelper(client => client.folder.images.partialUpdate)

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
                if(index !== undefined) navigation.navigateTo(index)
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
            navigator.newWindow({routeName: "Preview", params: {type: "collection", collectionId: illust.id}})
        }else{
            const imageIds = getEffectedItems(illust)
            const currentIndex = imageIds.indexOf(illust.id)
            navigator.newWindow({routeName: "Preview", params: { type: "image", imageIds, currentIndex}})
        }
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

    const dataDrop = dataDropOptions === undefined ? () => {} :
    dataDropOptions.dropInType === "illust" || dataDropOptions.dropInType === "partition" ? (_: number, __: CoverIllust[], ___: "ADD" | "MOVE") => {
        //FUTURE 以后再实现illust/partition区域的拖放功能
    } : dataDropOptions.dropInType === "collection" ? async (_: number | null, illusts: CoverIllust[], mode: "ADD" | "MOVE") => {
        const path = unref(dataDropOptions.path)
        if(path !== null && mode === "ADD") {
            //只选取ADD模式。MOVE模式意味着集合内的移动，但集合内是没有移动的，所以什么也不做
            const images = await dialog.addIllust.checkExistsInCollection(illusts.map(i => i.id), path)
            if(images !== undefined && images.length > 0) {
                await fetchCollectionImagesUpdate(path, [path, ...images])
            }
        }
    } : dataDropOptions.dropInType === "book" ? async (insertIndex: number | null, illusts: CoverIllust[], mode: "ADD" | "MOVE") => {
        const path = unref(dataDropOptions.path)
        if(path !== null) {
            if(mode === "ADD") {
                const images = await dialog.addIllust.checkExistsInBook(illusts.map(i => i.id), path)
                if(images !== undefined && images.length > 0) {
                    await fetchBookImagesPartialUpdate(path, {action: "ADD", images, ordinal: insertIndex})
                }
            }else if(illusts.length > 0) {
                //移动操作直接调用API即可，不需要检查
                await fetchBookImagesPartialUpdate(path, {action: "MOVE", images: illusts.map(i => i.id), ordinal: insertIndex})
            }
        }
    } : dataDropOptions.dropInType === "folder" ? async (insertIndex: number | null, illusts: CoverIllust[], mode: "ADD" | "MOVE") => {
        const path = unref(dataDropOptions.path)
        if(path !== null) {
            if(mode === "ADD") {
                const images = await dialog.addIllust.checkExistsInFolder(illusts.map(i => i.id), path)
                if(images !== undefined && images.length > 0) {
                    await fetchFolderImagesPartialUpdate(path, {action: "ADD", images, ordinal: insertIndex})
                }
            }else if(illusts.length > 0) {
                //移动操作直接调用API即可，不需要检查
                await fetchFolderImagesPartialUpdate(path, {action: "MOVE", images: illusts.map(i => i.id), ordinal: insertIndex})
            }
        }
    } : () => {}

    return {
        openDetailByClick, openDetailByEnter, openCollectionDetail, openInNewWindow, modifyFavorite,
        createCollection, splitToGenerateNewCollection, createBook, editAssociate, addToFolder, cloneImage, exportItem,
        deleteItem, removeItemFromCollection, removeItemFromBook, removeItemFromFolder, getEffectedItems, dataDrop
    }
}

export interface LocateIdOptions<T extends BasicIllust> {
    queryFilter: Ref<IllustQueryFilter>
    paginationData: PaginationDataView<T>
    selector: SelectedState<number>
    navigation: VirtualViewNavigation
}

/**
 * 提供一组有关locateId的实现。
 */
export function useLocateId<T extends BasicIllust>(options: LocateIdOptions<T>) {
    const locateId = ref<number | null>()
    const fetchFindLocation = useFetchHelper(client => client.illust.findLocation)
    
    watch(() => [options.paginationData.data.metrics.total, locateId.value] as const, async ([total, id]) => {
        if(total && id) {
            const res = await fetchFindLocation({
                ...options.queryFilter.value,
                imageId: id
            })
            if(res !== undefined) {
                options.selector.update([id], id)
                options.navigation.navigateTo(res.index)
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