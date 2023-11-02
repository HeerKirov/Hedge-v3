<script setup lang="ts">
import { ref, watch } from "vue"
import { Block, Button } from "@/components/universal"
import { Select } from "@/components/form"
import { FindSimilarEntityType, FindSimilarResultImage } from "@/functions/http-client/api/find-similar"
import { useFetchHelper } from "@/functions/fetch"
import { SimpleBook } from "@/functions/http-client/api/book"

const props = defineProps<{
    images: (FindSimilarResultImage | null)[]
}>()

const emit = defineEmits<{
    (e: "submit", book: SimpleBook): void
}>()

const submit = () => {
    if(selectValue.value !== undefined) emit("submit", selectValue.value)
}

const fetchImport = useFetchHelper(client => client.import.get)
const fetchIllust = useFetchHelper(client => (id: number) => client.illust.image.relatedItems.get(id, {}))

const bookResults: Record<`${FindSimilarEntityType}-${number}`, SimpleBook[]> = {}

const selectItems = ref<{label: string, value: SimpleBook}[]>([])
const selectValue = ref<SimpleBook>()

watch(() => props.images, async (images, oldImages) => {
    const remove = oldImages !== undefined && oldImages.length > 0 ? oldImages.filter(i => !images.some(j => i !== null && j !== null && i.type === j.type && i.id === j.id)) : []
    for(const image of remove) {
        const key = `${image!.type}-${image!.id}` as const
        delete bookResults[key]
    }
    const add = oldImages !== undefined && oldImages.length > 0 ? images.filter(i => !oldImages.some(j => i !== null && j !== null && i.type === j.type && i.id === j.id)) : images
    const promises = add.filter(i => i !== null).map(image => {
        const key = `${image!.type}-${image!.id}` as const
        if(image!.type === 'ILLUST') {
            return new Promise<[`${FindSimilarEntityType}-${number}`, SimpleBook[] | undefined]>(async resolve => {
                const res = await fetchIllust(image!.id)
                resolve([key, res?.books ?? undefined])
            })
        }else{
            return new Promise<[`${FindSimilarEntityType}-${number}`, SimpleBook[] | undefined]>(async resolve => {
                resolve([key, undefined])
            })
        }
    })
    const newResults = await Promise.all(promises)
    for(const [key, result] of newResults) {
        if(result !== undefined) {
            bookResults[key] = result
        }
    }

    const imageByBooks: Map<number, [SimpleBook, FindSimilarResultImage[]]> = new Map()

    for(const image of images) {
        if(image !== null) {
            const book = bookResults[`${image!.type}-${image!.id}`]
            if(book) {
                for(const b of book) {
                    if(imageByBooks.has(b.id)) {
                        const [_, images] = imageByBooks.get(b.id)!
                        images.push(image)
                    }else{
                        imageByBooks.set(b.id, [b, [image]])
                    }
                }
            }
        }
    }

    const newSelectItems: {label: string, value: SimpleBook}[] = []

    imageByBooks.forEach(([book, images]) => {
        const imageIdStr = images.map(i => `${i.type === "IMPORT_IMAGE" ? "+" : ""}${i.id}`).join(", ")
        newSelectItems.push({label: `${book.id}《${book.title}》 [ ${imageIdStr} ]`, value: book})
    })

    selectItems.value = newSelectItems
}, {immediate: true})

</script>
 
<template>
    <Block class="p-1">
        <p class="is-font-size-small">选择一个画集，将所有项加入此画集:</p>
        <Select :items="selectItems" v-model:value="selectValue"/>
        <div class="mt-1 has-text-right">
            <Button size="small" mode="filled" type="success" @click="submit">确认</Button>
        </div>
    </Block>
</template>