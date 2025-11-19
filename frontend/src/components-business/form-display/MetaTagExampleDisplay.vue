<script setup lang="ts">
import { Icon, GridImages } from "@/components/universal"
import { BookCard } from "@/components-business/element"
import { useTabRoute } from "@/modules/browser"
import { MetaType } from "@/functions/http-client/api/all"
import { useFetchEndpoint } from "@/functions/fetch"
import { toRef } from "@/utils/reactivity"
import { computed } from "vue"

const props = defineProps<{
    metaType: MetaType
    metaName: string
    metaId: number
}>()

const router = useTabRoute()

const path = toRef(props, "metaId")

const { data: illustData } = useFetchEndpoint({
    path,
    get: client => metaId => client.illust.list({limit: 20, [props.metaType.toLowerCase()]: metaId, type: "COLLECTION", order: "-orderTime"})
})

const { data: bookData } = useFetchEndpoint({
    path,
    get: client => metaId => client.book.list({limit: 6, [props.metaType.toLowerCase()]: metaId, order: "-updateTime"})
})

const illustImages = computed(() => illustData.value?.result?.map(i => i.filePath.sample) ?? [])

const openIllust = (index?: number) => {
    const locateId = index !== undefined ? illustData.value?.result?.[index]?.id : undefined
    router.routePush({routeName: "Illust", initializer: {[`${props.metaType.toLowerCase()}Name`]: props.metaName, locateId}})
}

const openBookSearch = () => {
    router.routePush({routeName: "Book", initializer: {[`${props.metaType.toLowerCase()}Name`]: props.metaName}})
}

const openBook = (id: number) => {
    router.routePush({routeName: "BookDetail", path: id})
}

</script>

<template>
    <div>
        <template v-if="bookData?.result?.length">
            <div class="flex jc-between mt-1">
                <span><b>{{ bookData.total }}</b>个画集</span>
                <a @click="openBookSearch()">搜索"{{ metaName }}"的全部画集<Icon class="ml-1" icon="angle-double-right"/></a>
            </div>
            <div :class="$style.books">
                <BookCard v-for="b in bookData.result" :key="b.id" :class="$style.book" :item="b" @click="openBook(b.id)"/>
            </div>
        </template>
        <div class="flex jc-between mt-1">
            <span><b>{{ illustData?.total ?? 0 }}</b>个图库项目</span>
            <a @click="openIllust()">搜索"{{ metaName }}"的全部图库项目<Icon class="ml-1" icon="angle-double-right"/></a>
        </div>
        <GridImages v-if="illustImages.length" class="mt-2" :column-num="5" :images="illustImages" clickable @click="(_, i) => openIllust(i)"/>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.books
    $column-num: 6
    $gap: size.$spacing-2
    display: flex
    flex-wrap: wrap
    gap: $gap
    margin-top: size.$spacing-2
    > .book
        flex-shrink: 0
        position: relative
        width: calc((100% - ($column-num - 1) * $gap) / $column-num)
        aspect-ratio: 3 / 4
        margin: 0
        cursor: pointer
</style>