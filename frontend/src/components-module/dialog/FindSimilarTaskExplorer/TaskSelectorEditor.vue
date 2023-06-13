<script setup lang="ts">
import { reactive, watch, computed, ref } from "vue"
import { Block, Button, GridImages } from "@/components/universal"
import { Group } from "@/components/layout"
import { Select, Input } from "@/components/form"
import { DateEditor, SourceSiteSelectBox, RelatedTopicEditor, RelatedAuthorEditor } from "@/components-business/form-editor"
import { SimpleAuthor, SimpleTopic } from "@/functions/http-client/api/all"
import { CoverIllust, SimpleIllust } from "@/functions/http-client/api/illust"
import { ImportImage } from "@/functions/http-client/api/import"
import { TaskSelector } from "@/functions/http-client/api/find-similar"
import { useFetchHelper } from "@/functions/fetch"
import { useMessageBox } from "@/modules/message-box"
import { useDroppable } from "@/modules/drag"
import { useSettingSite } from "@/services/setting"
import { LocalDate, date } from "@/utils/datetime"

const props = defineProps<{
    selector: TaskSelector
}>()

const emit = defineEmits<{
    (e: "update:selector", value: TaskSelector): void
}>()

const message = useMessageBox()

const { data: site } = useSettingSite()

const fetchIllusts = useFetchHelper(client => client.illust.findByIds)
const fetchImportImage = useFetchHelper(client => client.import.get)
const fetchTopic = useFetchHelper(client => client.topic.get)
const fetchAuthor = useFetchHelper(client => client.author.get)

const loadingCache = reactive({
    images: <SimpleIllust[]>[],
    importImages: <ImportImage[]>[],
    topics: <SimpleTopic[]>[],
    authors: <SimpleAuthor[]>[]
})

const addImageInputText = ref<string>("")

const imageFilepaths = computed(() => loadingCache.images.map(i => i.thumbnailFile))

const importImageFilepaths = computed(() => loadingCache.importImages.map(i => i.thumbnailFile))

const { dragover: _, ...dropEvents } = useDroppable(["importImages", "illusts"], (data, type) => {
    if(props.selector.type === "image" && type === "illusts" && data.length > 0) {
        const imageIds = props.selector.imageIds
        const add = (<CoverIllust[]>data).filter(i => imageIds.indexOf(i.id) < 0)
        loadingCache.images = [...loadingCache.images, ...add.map(i => ({id: i.id, thumbnailFile: i.thumbnailFile}))]
        emit("update:selector", {type: "image", imageIds: [...props.selector.imageIds, ...add.map(i => i.id)]})
    }else if(props.selector.type === "importImage" && type === "importImages" && data.length > 0) {
        const importIds = props.selector.importIds
        const add = (<ImportImage[]>data).filter(i => importIds.indexOf(i.id) < 0)
        loadingCache.importImages = [...loadingCache.importImages, ...add]
        emit("update:selector", {type: "importImage", importIds: [...props.selector.importIds, ...add.map(i => i.id)]})
    }
})

watch(() => props.selector, async (selector, old) => {
    if(old !== undefined && selector.type !== old.type) {
        loadingCache.images = []
        loadingCache.importImages = []
        loadingCache.topics = []
        loadingCache.authors = []
    }
    if(selector.type === "image") {
        const map: Record<number, SimpleIllust> = {}
        const newImageIds: number[] = []
        for(const id of selector.imageIds) {
            const exist = loadingCache.images.find(i => i.id === id)
            if(exist) {
                map[id] = exist
            }else{
                newImageIds.push(id)
            }
        }
        if(newImageIds.length > 0) {
            const res = await fetchIllusts(newImageIds)
            if(res !== undefined && res.length) {
                for(const r of res) {
                    if(r !== null) {
                        map[r.id] = {id: r.id, thumbnailFile: r.thumbnailFile}
                    }
                }
            }
        }
        loadingCache.images = selector.imageIds.map(id => map[id]).filter(i => i !== null)   
    }else if(selector.type === "importImage") {
        const map: Record<number, ImportImage> = {}
        const newImportIds: number[] = []
        for(const id of selector.importIds) {
            const exist = loadingCache.importImages.find(i => i.id === id)
            if(exist) {
                map[id] = exist
            }else{
                newImportIds.push(id)
            }
        }
        for(const r of await Promise.all(newImportIds.map(id => fetchImportImage(id)))) {
            if(r !== undefined) {
                map[r.id] = r
            }
        }
        loadingCache.importImages = selector.importIds.map(id => map[id]).filter(i => i !== null)
    }else if(selector.type === "topic") {
        const map: Record<number, SimpleTopic> = {}
        const newTopicIds: number[] = []
        for(const id of selector.topicIds) {
            const exist = loadingCache.topics.find(i => i.id === id)
            if(exist) {
                map[id] = exist
            }else{
                newTopicIds.push(id)
            }
        }
        for(const r of await Promise.all(newTopicIds.map(id => fetchTopic(id)))) {
            if(r !== undefined) {
                map[r.id] = {id: r.id, name: r.name, type: r.type, color: r.color}
            }
        }
        loadingCache.topics = selector.topicIds.map(id => map[id]).filter(i => i !== null)
    }else if(selector.type === "author") {
        const map: Record<number, SimpleAuthor> = {}
        const newAuthorIds: number[] = []
        for(const id of selector.authorIds) {
            const exist = loadingCache.authors.find(i => i.id === id)
            if(exist) {
                map[id] = exist
            }else{
                newAuthorIds.push(id)
            }
        }
        for(const r of await Promise.all(newAuthorIds.map(id => fetchAuthor(id)))) {
            if(r !== undefined) {
                map[r.id] = {id: r.id, name: r.name, type: r.type, color: r.color}
            }
        }
        loadingCache.authors = selector.authorIds.map(id => map[id]).filter(i => i !== null)
    }
}, {immediate: true})

const updateSelectorType = (v: TaskSelector["type"]) => {
    if(v === "image") {
        emit("update:selector", {type: "image", imageIds: []})
    }else if(v === "importImage") {
        emit("update:selector", {type: "importImage", importIds: []})
    }else if(v === "partitionTime") {
        emit("update:selector", {type: "partitionTime", partitionTime: date.now()})
    }else if(v === "topic") {
        emit("update:selector", {type: "topic", topicIds: []})
    }else if(v === "author") {
        emit("update:selector", {type: "author", authorIds: []})
    }else if(v === "sourceTag") {
        emit("update:selector", {type: "sourceTag", sourceSite: site.value?.length ? site.value[0].name : "", sourceTags: []})
    }
}

const addImageId = async () => {
    const id = parseInt(addImageInputText.value)
    if(!isNaN(id) && props.selector.type === "image" && props.selector.imageIds.indexOf(id) < 0) {
        const res = await fetchIllusts([id])
        if(res !== undefined) {
            if(res[0] !== null) {
                loadingCache.images = [...loadingCache.images, res[0]]
                emit("update:selector", {type: "image", imageIds: [...props.selector.imageIds, id]})
                addImageInputText.value = ""
            }else{
                message.showOkMessage("prompt", "添加的ID无效。", "请确认此ID是否为已存在的有效ID。")
            }
        }
    }
}

const updatePartitionTime = (v: LocalDate) => {
    emit("update:selector", {type: "partitionTime", partitionTime: v})
}

const updateSourceSite = (v: string | null) => {
    if(v !== null && props.selector.type === "sourceTag") {
        emit("update:selector", {type: "sourceTag", sourceSite: v, sourceTags: props.selector.sourceTags})
    }
}

const updateSourceTags = (idx: number, v: string) => {
    if(props.selector.type === "sourceTag") {
        emit("update:selector", {type: "sourceTag", sourceSite: props.selector.sourceSite, sourceTags: [...props.selector.sourceTags.slice(0, idx), v, ...props.selector.sourceTags.slice(idx + 1)]})
    }
}

const addSourceTags = () => {
    if(props.selector.type === "sourceTag") {
        emit("update:selector", {type: "sourceTag", sourceSite: props.selector.sourceSite, sourceTags: [...props.selector.sourceTags, ""]})
    }
}

const updateTopics = (v: SimpleTopic[]) => {
    loadingCache.topics = v
    emit("update:selector", {type: "topic", topicIds: loadingCache.topics.map(i => i.id)})
}

const updateAuthors = (v: SimpleAuthor[]) => {
    loadingCache.authors = v
    emit("update:selector", {type: "author", authorIds: loadingCache.authors.map(i => i.id)})
}

const description: Record<TaskSelector["type"], string> = {
    "image": "给出特定的图像。",
    "importImage": "给出特定的导入项目。",
    "partitionTime": "选择指定时间分区内的所有图像和导入项目。",
    "topic": "选择指定主题所属的所有图像。",
    "author": "选择指定作者所属的所有图像。",
    "sourceTag": "选择指定来源标签关联的所有图像和导入项目。"
} as const

const selectorItems: {label: string, value: TaskSelector["type"]}[] = [
    {value: "image", label: "图像"},
    {value: "importImage", label: "导入项目"},
    {value: "partitionTime", label: "时间分区"},
    {value: "topic", label: "主题"},
    {value: "author", label: "作者"},
    {value: "sourceTag", label: "来源标签"}
]

</script>

<template>
    <div class="mb-2 is-line-height-std">
        <Select :items="selectorItems" :value="props.selector.type" @update:value="updateSelectorType"/>
        <span class="ml-1 secondary-text">{{ description[props.selector.type] ?? "" }}</span>
    </div>
    <div v-if="props.selector.type === 'image'" v-bind="dropEvents">
        <GridImages :images="imageFilepaths" :column-num="5"/>
        <Block class="has-text-centered has-text-secondary is-line-height-small py-2 mt-1">
            拖曳图像到此处 或 直接输入ID <Input width="half" size="small" v-model:value="addImageInputText" @enter="addImageId"/>
        </Block>
    </div>
    <div v-if="props.selector.type === 'importImage'">
        <GridImages :images="importImageFilepaths" :column-num="5"/>
        <Block class="has-text-centered has-text-secondary is-line-height-small py-2 mt-1" v-bind="dropEvents">拖曳导入项目到此处</Block>
    </div>
    <div v-if="props.selector.type === 'partitionTime'">
        <DateEditor :value="props.selector.partitionTime" @update:value="updatePartitionTime"/>
    </div>
    <div v-if="props.selector.type === 'topic'">
        <RelatedTopicEditor mode="embedded" :value="loadingCache.topics" @update:value="updateTopics"/>
    </div>
    <div v-if="props.selector.type === 'author'">
        <RelatedAuthorEditor mode="embedded" :value="loadingCache.authors" @update:value="updateAuthors"/>
    </div>
    <div v-if="props.selector.type === 'sourceTag'">
        <SourceSiteSelectBox :value="props.selector.sourceSite" @update:value="updateSourceSite"/>
        <Group class="mt-1">
            <Input v-for="(t, idx) in props.selector.sourceTags" placeholder="标签名称" width="half" size="small" :value="t" @update:value="updateSourceTags(idx, $event)"/>
            <Button square size="small" mode="filled" type="primary" icon="plus" @click="addSourceTags"/>
        </Group>
    </div>
</template>