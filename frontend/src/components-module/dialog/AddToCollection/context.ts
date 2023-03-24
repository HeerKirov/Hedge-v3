import { computed, ref, Ref, watch } from "vue"
import { useFetchHelper, usePostPathFetchHelper } from "@/functions/fetch"
import { arrays } from "@/utils/primitives"
import { Push } from "../context"

export interface AddToCollection {
    addToCollection(images: number[], collectionId: number, onAdded?: () => void): void
}

export interface AddToCollectionProps {
    images: number[]
    situations: {id: number, thumbnailFile: string, hasParent: boolean}[]
    collectionId: number
    onAdded?(): void
}

export function useAddToCollection(push: Push): AddToCollection {
    const fetchSituation = useFetchHelper(client => client.illustUtil.getImageSituation)

    return {
        async addToCollection(images: number[], collectionId: number, onAdded?: () => void) {
            const res = await fetchSituation(images)
            if(res !== undefined) {
                const situations = res
                    .filter(item => item.belong === null || item.belong.id !== collectionId) //排除当前集合的项
                    .map(item => ({id: item.id, thumbnailFile: item.thumbnailFile, hasParent: item.belong !== null}))
                if(situations.length > 0) {
                    //解析后的列表如果不为空，那么确定打开对话框
                    push({
                        type: "addToCollection",
                        props: {images, collectionId, situations, onAdded}
                    })
                }
            }
        }
    }
}

export function useAddToCollectionContext(images: Ref<number[]>, collectionId: Ref<number>, situations: Ref<{id: number, thumbnailFile: string, hasParent: boolean}[]>, onAdded: () => void) {
    const fetchCollectionImagesUpdate = usePostPathFetchHelper(client => client.illust.collection.images.update)

    const selections = ref<boolean[]>([])
    const selectedCount = computed(() => selections.value.filter(i => i).length)
    const anyHasParent = computed(() => situations.value.some(item => item.hasParent))

    const selectAll = () => {
        selections.value = arrays.newArray(situations.value.length, () => true)
    }

    const selectReverse = () => {
        selections.value = selections.value.map(v => !v)
    }

    watch(situations, selectAll, {immediate: true})

    const submit = async () => {
        const addedItems = situations.value.filter((_, index) => selections.value[index]).map(item => item.id)
        if(addedItems.length) {
            const res = await fetchCollectionImagesUpdate(collectionId.value, [collectionId.value, ...addedItems])
            if(res) {
                onAdded()
            }
        }
    }

    return {submit, selectAll, selectReverse, selectedCount, selections, anyHasParent}
}
