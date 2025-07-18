<script setup lang="ts">
import { computed, ref } from "vue"
import { Icon, Block } from "@/components/universal"
import { Group } from "@/components/layout"
import { SimpleMetaTagElement } from "@/components-business/element"
import { useCalloutService } from "@/components-module/callout"
import { ExportType, MetaTagTypes, MetaTagTypeValue, MetaTagValues, SimpleAuthor, SimpleTag, SimpleTopic } from "@/functions/http-client/api/all"
import { IllustType } from "@/functions/http-client/api/illust"
import { usePopupMenu } from "@/modules/popup-menu"
import { isBrowserEnvironment, useBrowserTabs, useTabRoute } from "@/modules/browser"
import { writeClipboard } from "@/modules/others"

const props = withDefaults(defineProps<{
    authors: (SimpleAuthor & { isExported?: ExportType })[]
    topics: (SimpleTopic & { isExported?: ExportType })[]
    tags: (SimpleTag & { isExported?: ExportType })[]
    direction?: "vertical" | "horizontal"
    category?: "self" | "related"
    selfIs?: IllustType
    max?: number
}>(), {
    direction: "vertical",
    category: "self",
    selfIs: "IMAGE"
})

const emit = defineEmits<{
    (e: "edit", category: "self" | "related"): void
}>()

const callout = useCalloutService()
const hasBrowser = isBrowserEnvironment()
const browserTabs = hasBrowser ? useBrowserTabs() : undefined
const router = hasBrowser ? useTabRoute() : undefined

const expand = ref(false)

const filteredTags = computed(() => props.tags.filter(props.category === "self" ? i => i.isExported !== "FROM_RELATED" : i => i.isExported === "FROM_RELATED"))
const filteredTopics = computed(() => props.topics.filter(props.category === "self" ? i => i.isExported !== "FROM_RELATED" : i => i.isExported === "FROM_RELATED"))
const filteredAuthors = computed(() => props.authors.filter(props.category === "self" ? i => i.isExported !== "FROM_RELATED" : i => i.isExported === "FROM_RELATED"))

const tags = computed(() => props.max !== undefined && !expand.value && filteredTags.value.length > props.max ? filteredTags.value.slice(0, props.max) : (filteredTags.value ?? []))
const topics = computed(() => props.max !== undefined && !expand.value && filteredTopics.value.length > props.max ? filteredTopics.value.slice(0, props.max) : (filteredTopics.value ?? []))
const authors = computed(() => props.max !== undefined && !expand.value && filteredAuthors.value.length > props.max ? filteredAuthors.value.slice(0, props.max) : (filteredAuthors.value ?? []))
const shouldCollapse = computed(() => props.max !== undefined && (filteredTags.value.length > props.max || filteredTopics.value.length > props.max || filteredAuthors.value.length > props.max))

const openMetaTagDetail = ({ type, value }: MetaTagTypeValue) => {
    if(type === "tag") router!.routePush({routeName: "Tag", initializer: {tagId: value.id}})
    else if(type === "topic") router!.routePush({routeName: "TopicDetail", path: value.id})
    else if(type === "author") router!.routePush({routeName: "AuthorDetail", path: value.id})
}
const openMetaTagDetailInNewTab = ({ type, value }: MetaTagTypeValue) => {
    if(type === "tag") browserTabs!.newTab({routeName: "Tag", initializer: {tagId: value.id}})
    else if(type === "topic") browserTabs!.newTab({routeName: "TopicDetail", path: value.id})
    else if(type === "author") browserTabs!.newTab({routeName: "AuthorDetail", path: value.id})
}
const openMetaTagDetailInNewWindow = ({ type, value }: MetaTagTypeValue) => {
    if(type === "tag") browserTabs!.newWindow({routeName: "Tag", initializer: {tagId: value.id}})
    else if(type === "topic") browserTabs!.newWindow({routeName: "TopicDetail", path: value.id})
    else if(type === "author") browserTabs!.newWindow({routeName: "AuthorDetail", path: value.id})
}
const searchInIllusts = ({ type, value }: MetaTagTypeValue) => {
    if(type === "tag") router!.routePush({routeName: "Illust", initializer: {tagName: value.name}})
    else if(type === "topic") router!.routePush({routeName: "Illust", initializer: {topicName: value.name}})
    else if(type === "author") router!.routePush({routeName: "Illust", initializer: {authorName: value.name}})
}
const searchInBooks = ({ type, value }: MetaTagTypeValue) => {
    if(type === "tag") router!.routePush({routeName: "Book", initializer: {tagName: value.name}})
    else if(type === "topic") router!.routePush({routeName: "Book", initializer: {topicName: value.name}})
    else if(type === "author") router!.routePush({routeName: "Book", initializer: {authorName: value.name}})
}
const copyMetaTagName = ({ value }: MetaTagTypeValue) => writeClipboard(value.name)

const click = (e: MouseEvent, type: MetaTagTypes, value: MetaTagValues) => {
    callout.show({base: (e.target as Element).getBoundingClientRect(), callout: "metaTag", metaType: type, metaId: value.id})
}

const edit = () => {
    emit("edit", props.category)
}

const menu = usePopupMenu<MetaTagTypeValue>([
    ...(hasBrowser ? [
        {type: "normal", "label": "查看标签详情", click: openMetaTagDetail},
        {type: "normal", "label": "在新标签页中打开标签详情", click: openMetaTagDetailInNewTab},
        {type: "normal", "label": "在新窗口中打开标签详情", click: openMetaTagDetailInNewWindow},
        {type: "separator"},
        {type: "normal", "label": "在图库中搜索", click: searchInIllusts},
        {type: "normal", "label": "在画集中搜索", click: searchInBooks},
    ] as const : []),
    {type: "normal", "label": "复制此标签的名称", click: copyMetaTagName}
] )

</script>

<template>
    <Group v-if="(tags.length || authors.length || topics.length) && direction === 'horizontal'" @dblclick="edit">
        <SimpleMetaTagElement v-for="author in authors" type="author" :value="author" @click="click($event, 'author', author)" @contextmenu="menu.popup({type: 'author', value: author})"/>
        <SimpleMetaTagElement v-for="topic in topics" type="topic" :value="topic" @click="click($event, 'topic', topic)" @contextmenu="menu.popup({type: 'topic', value: topic})"/>
        <SimpleMetaTagElement v-for="tag in tags" type="tag" :value="tag" @click="click($event, 'tag', tag)" @contextmenu="menu.popup({type: 'tag', value: tag})"/>
        <a v-if="shouldCollapse && !expand" class="no-wrap" @click="expand = true">查看全部<Icon class="ml-1" icon="angle-double-right"/></a>
    </Group>
    <div v-else-if="tags.length || authors.length || topics.length" class="relative" @dblclick="edit">
        <SimpleMetaTagElement v-for="author in authors" class="mt-1" type="author" :value="author" wrapped-by-div @click="click($event, 'author', author)" @contextmenu="menu.popup({type: 'author', value: author})">
            <template #behind>
                <Block v-if="author.isExported === 'YES'" :class="[$style.exported, 'has-text-secondary']">E</Block>
            </template>
        </SimpleMetaTagElement>
        <SimpleMetaTagElement v-for="topic in topics" class="mt-1" type="topic" :value="topic" wrapped-by-div @click="click($event, 'topic', topic)" @contextmenu="menu.popup({type: 'topic', value: topic})">
            <template #behind>
                <Block v-if="topic.isExported === 'YES'" :class="[$style.exported, 'has-text-secondary']">E</Block>
            </template>
        </SimpleMetaTagElement>
        <SimpleMetaTagElement v-for="tag in tags" class="mt-1" type="tag" :value="tag" wrapped-by-div @click="click($event, 'tag', tag)" @contextmenu="menu.popup({type: 'tag', value: tag})">
            <template #behind>
                <Block v-if="tag.isExported === 'YES'" :class="[$style.exported, 'has-text-secondary']">E</Block>
            </template>
        </SimpleMetaTagElement>
        <div v-if="shouldCollapse && !expand"><a class="no-wrap" @click="expand = true">查看全部<Icon class="ml-1" icon="angle-double-right"/></a></div>

    </div>
    <div v-else class="has-text-secondary" @dblclick="edit">
        <Icon icon="tag"/>
        <i>没有{{category === "related" ? (selfIs === "IMAGE" ? "继承的" : "聚合的") : ""}}标签</i>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.exported
    display: inline-block
    padding: 0 3px
    margin-left: 2px
    font-size: size.$font-size-tiny
    transform: scale(70%, 70%) translateY(-30%)
</style>