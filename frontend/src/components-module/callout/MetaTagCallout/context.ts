import { computed, Ref } from "vue"
import { MetaTagTypes } from "@/functions/http-client/api/all"
import { useFetchEndpoint } from "@/functions/fetch"
import { ServiceBaseType } from "../context"

export interface MetaTagProps extends ServiceBaseType<"metaTag"> {
    metaType: MetaTagTypes
    metaId: number
}

export function useTopicDetailData(path: Ref<number>) {
    const { data, setData } = useFetchEndpoint({
        path,
        get: client => client.topic.get,
        update: client => client.topic.update
    })

    const toggleFavorite = () => {
        if(data.value !== null) {
            setData({favorite: !data.value.favorite}).finally()
        }
    }

    return {data, toggleFavorite}
}

export function useAuthorDetailData(path: Ref<number>) {
    const { data, setData } = useFetchEndpoint({
        path,
        get: client => client.author.get,
        update: client => client.author.update
    })

    const toggleFavorite = () => {
        if(data.value !== null) {
            setData({favorite: !data.value.favorite}).finally()
        }
    }

    return {data, toggleFavorite}
}

export function useTagDetailData(path: Ref<number>) {
    const { data } = useFetchEndpoint({
        path,
        get: client => client.tag.get
    })

    const addressInfo = computed<{address: string | null, member: boolean, memberIndex: number | undefined}>(() => {
        if(data.value !== null && data.value.parents.length) {
            const address = data.value.parents.map(i => i.name).join(".")
            const parent = data.value.parents[data.value.parents.length - 1]
            const member = parent.group !== "NO"
            const memberIndex = parent.group === "SEQUENCE" || parent.group === "FORCE_AND_SEQUENCE" ? data.value.ordinal + 1 : undefined

            return {address, member, memberIndex}
        }else{
            return {address: null, member: false, memberIndex: undefined}
        }
    })

    return {data, addressInfo}
}
