<script setup lang="ts">
import { ref } from "vue"
import { CheckBox } from "@/components/form"
import { Button } from "@/components/universal"
import { BottomLayout } from "@/components/layout"
import { SimpleMetaTagElement } from "@/components-business/element"
import { SimpleTag, SimpleTopic, SimpleAuthor, MetaTagTypeValue } from "@/functions/http-client/api/all"

const props = defineProps<{
    tags: SimpleTag[]
    topics: SimpleTopic[]
    authors: SimpleAuthor[]
    tagFilter: boolean
    topicFilter: boolean
    authorFilter: boolean
}>()

const emit = defineEmits<{
    (e: "add", value: MetaTagTypeValue[]): void
}>()

const selectedAuthors = ref<Record<number, boolean>>({})
const selectedTopics = ref<Record<number, boolean>>({})
const selectedTags = ref<Record<number, boolean>>({})

const selectAll = () => {
    if(props.tagFilter) selectedTags.value = {}
    if(props.authorFilter) selectedAuthors.value = {}
    if(props.topicFilter) selectedTopics.value = {}
}

const selectNone = () => {
    if(props.tagFilter) for (const tag of props.tags) {
        selectedTags.value[tag.id] = false
    }
    if(props.topicFilter) for (const topic of props.topics) {
        selectedTopics.value[topic.id] = false
    }
    if(props.authorFilter) for (const author of props.authors) {
        selectedAuthors.value[author.id] = false
    }
}

const selectReverse = () => {
    if(props.tagFilter) for (const tag of props.tags) {
        if(selectedTags.value[tag.id] === false) {
            delete selectedTags.value[tag.id]
        }else{
            selectedTags.value[tag.id] = false
        }
    }
    if(props.topicFilter) for (const topic of props.topics) {
        if(selectedTopics.value[topic.id] === false) {
            delete selectedTopics.value[topic.id]
        }else{
            selectedTopics.value[topic.id] = false
        }
    }
    if(props.authorFilter) for (const author of props.authors) {
        if(selectedAuthors.value[author.id] === false) {
            delete selectedAuthors.value[author.id]
        }else{
            selectedAuthors.value[author.id] = false
        }
    }
}

const addAll = () => {
    const addList: MetaTagTypeValue[] = []
    if(props.authorFilter) for (const author of props.authors) {
        if(selectedAuthors.value[author.id] !== false) addList.push({type: "author", value: author})
    }
    if(props.topicFilter) for (const topic of props.topics) {
        if(selectedTopics.value[topic.id] !== false) addList.push({type: "topic", value: topic})
    }
    if(props.tagFilter) for (const tag of props.tags) {
        if(selectedTags.value[tag.id] !== false) addList.push({type: "tag", value: tag})
    }
    if(addList.length) {
        emit("add", addList)
        selectNone()
    }
}

//TODO 添加左键点击打开callout

</script>

<template>
    <BottomLayout>
        <div class="p-4">
            <template v-if="authorFilter">
                <div v-for="author in authors" :key="author.id" class="mb-1">
                    <CheckBox :value="selectedAuthors[author.id] ?? true" @update:value="selectedAuthors[author.id] = $event"/>
                    <SimpleMetaTagElement type="author" :value="author" draggable @dblclick="$emit('add', [{type: 'author', value: author}])"/>
                </div>
            </template>
            <template v-if="topicFilter">
                <div v-for="topic in topics" :key="topic.id" class="mb-1">
                    <CheckBox :value="selectedTopics[topic.id] ?? true" @update:value="selectedTopics[topic.id] = $event"/>
                    <SimpleMetaTagElement type="topic" :value="topic" draggable @dblclick="$emit('add', [{type: 'topic', value: topic}])"/>
                </div>
            </template>
            <template v-if="tagFilter">
                <div v-for="tag in tags" :key="tag.id" class="mb-1">
                    <CheckBox :value="selectedTags[tag.id] ?? true" @update:value="selectedTags[tag.id] = $event"/>
                    <SimpleMetaTagElement type="tag" :value="tag" draggable @dblclick="$emit('add', [{type: 'tag', value: tag}])"/>
                </div>
            </template>
        </div>
        <template #bottom>
            <div class="mt-1 mr-4 mb-4 ml-1">
                <Button type="primary" icon="check-square" @click="selectAll">全选</Button>
                <Button type="primary" icon="check-square-regular" @click="selectReverse">反选</Button>
                <Button class="float-right" type="primary" icon="check-circle" @click="addAll">添加所选项</Button>
            </div>
        </template>
    </BottomLayout>
</template>
