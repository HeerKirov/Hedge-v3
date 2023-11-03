<script setup lang="ts">
import { ref, watch } from "vue"
import { Block, Button } from "@/components/universal"
import { Select } from "@/components/form"
import { FindSimilarEntityKey, FindSimilarResultImage } from "@/functions/http-client/api/find-similar"
import { useFetchHelper } from "@/functions/fetch"
import { SimpleCollection } from "@/functions/http-client/api/illust"
import { strings } from "@/utils/primitives"

const props = defineProps<{
    images: (FindSimilarResultImage | null)[]
}>()

const emit = defineEmits<{
    (e: "submit", collectionId: string | number): void
}>()

const submit = () => {
    if(selectValue.value !== undefined) emit("submit", selectValue.value)
}

const fetchIllust = useFetchHelper(client => (id: number) => client.illust.image.relatedItems.get(id, {}))

const collectionResults: Record<FindSimilarEntityKey, SimpleCollection | string> = {}

const selectItems = ref<{label: string, value: string | number}[]>([])
const selectValue = ref<number | string>()

watch(() => props.images, async (images, oldImages) => {
    const remove = oldImages !== undefined && oldImages.length > 0 ? oldImages.filter(i => !images.some(j => i !== null && j !== null && i.id === j.id)) : []
    for(const image of remove) {
        delete collectionResults[image!.id]
    }
    const add = oldImages !== undefined && oldImages.length > 0 ? images.filter(i => !oldImages.some(j => i !== null && j !== null && i.id === j.id)) : images
    const promises = add.filter(i => i !== null).map(image => {
        return new Promise<[FindSimilarEntityKey, SimpleCollection | string | undefined]>(async resolve => {
            const res = await fetchIllust(image!.id)
            resolve([image!.id, res?.collection ?? undefined])
        })
    })
    const newResults = await Promise.all(promises)
    for(const [key, result] of newResults) {
        if(result !== undefined) {
            collectionResults[key] = result
        }
    }


    const imageByCollections: Map<string | number, FindSimilarResultImage[]> = new Map()

    for(const image of images) {
        if(image !== null) {
            const collection = collectionResults[image!.id]
            if(collection) {
                const collectionId = typeof collection === "string" ? collection : collection.id
                if(imageByCollections.has(collectionId)) {
                    imageByCollections.get(collectionId)!.push(image)
                }else{
                    imageByCollections.set(collectionId, [image])
                }
            }
        }
    }

    const newSelectItems: {label: string, value: string | number}[] = []

    imageByCollections.forEach((images, collectionId) => {
        const imageIdStr = images.join(", ")
        newSelectItems.push({label: `集合${typeof collectionId === "string" ? "#" : "@"}${collectionId} [ ${imageIdStr} ]`, value: collectionId})
    })

    const newHashString = strings.randomString(8)
    newSelectItems.push({label: `新建集合 (#${newHashString})`, value: newHashString})

    selectItems.value = newSelectItems
}, {immediate: true})

</script>
 
<template>
    <Block class="p-1">
        <p class="is-font-size-small">选择一个集合，将所有项加入此集合:</p>
        <Select :items="selectItems" v-model:value="selectValue"/>
        <div class="mt-1 has-text-right">
            <Button size="small" mode="filled" type="success" @click="submit">确认</Button>
        </div>
    </Block>
</template>
