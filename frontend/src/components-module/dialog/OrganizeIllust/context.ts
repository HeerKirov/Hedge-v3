import { onMounted, Ref, ref, shallowRef, watch } from "vue"
import { useFetchHelper, usePostFetchHelper } from "@/functions/fetch"
import { OrganizationSituation, OrganizationSituationForm } from "@/functions/http-client/api/util-illust"
import { useLocalStorage } from "@/functions/app"
import { USEFUL_COLORS, UsefulColors } from "@/constants/ui"
import { Push } from "../context"

export interface OrganizeIllust {
    /**
     * 传入一组images，对其进行整理并预览。
     * @param images 要进行整理的image id列表。
     * @param onSucceed 如果成功保存，则执行回调。
     */
    organize(images?: number[], onSucceed?: () => void): void
}

export interface OrganizeIllustProps {
    images: number[]
    onSucceed?(): void
}

export function useOrganizeIllust(push: Push): OrganizeIllust {
    return {
        async organize(images, onSucceed) {
            push({
                type: "organizeIllust",
                props: {images: images ?? [], onSucceed}
            })
        }
    }
}

export function useOrganizeIllustContext(imageIds: Ref<number[]>, onSucceed: () => void) {
    const fetchOrganizationSituation = useFetchHelper(client => client.illustUtil.getOrganizationSituation)
    const fetchApplyOrganizationSituation = usePostFetchHelper(client => client.illustUtil.applyOrganizationSituation)

    const formStorage = useLocalStorage<Omit<OrganizationSituationForm, "illustIds">>("dialog/organize-illust/form", {})

    const form = ref<Omit<OrganizationSituationForm, "illustIds">>({...formStorage.value})

    const data = shallowRef<OrganizationSituation[][]>()

    const images = shallowRef<OrganizationSituationImage[]>()

    const loading = ref(true)

    const formAnyChanged = ref(false)

    const reloadData = async () => {
        formAnyChanged.value = false
        formStorage.value = {...form.value}
        loading.value = true
        const res = await fetchOrganizationSituation({...form.value, illustIds: imageIds.value})
        if(res !== undefined) {
            const newImages: OrganizationSituationImage[] = []
            let currentGroup: number = 0
            for(const group of res) {
                if(group.length > 1) {
                    const groupColor = USEFUL_COLORS[currentGroup % USEFUL_COLORS.length]
                    currentGroup += 1
                    for(let i = 0; i < group.length; i++) {
                        const item = group[i]
                        newImages.push({...item, groupColor, groupFirst: i === 0, groupLast: i === group.length - 1})
                    }
                }else{
                    newImages.push({...group[0], groupColor: null, groupFirst: false, groupLast: false})
                }
            }
            images.value = newImages
            data.value = res
        }
        loading.value = false
    }

    const apply = async () => {
        if(data.value !== undefined && !loading.value) {
            loading.value = true
            const ok = await fetchApplyOrganizationSituation({groups: data.value.map(g => g.map(i => ({id: i.id, newOrderTime: i.newOrderTime})))})
            if(ok) onSucceed()
        }
    }

    onMounted(reloadData)

    watch(form, () => formAnyChanged.value = true, {deep: true})

    return {images, loading, data, form, formAnyChanged, reloadData, apply}
}

interface OrganizationSituationImage extends OrganizationSituation {
    groupColor: UsefulColors | null
    groupFirst: boolean
    groupLast: boolean
}
