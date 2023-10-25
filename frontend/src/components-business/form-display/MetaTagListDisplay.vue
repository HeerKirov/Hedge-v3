<script setup lang="ts">
import { computed, ref } from "vue"
import { Icon, Block } from "@/components/universal"
import { Group } from "@/components/layout"
import { SimpleMetaTagElement } from "@/components-business/element"
import { useCalloutService } from "@/components-module/callout"
import { MetaTagTypes, MetaTagTypeValue, MetaTagValues, SimpleAuthor, SimpleTag, SimpleTopic } from "@/functions/http-client/api/all"
import { usePopupMenu } from "@/modules/popup-menu"
import { useRouterNavigator } from "@/modules/router"
import { writeClipboard } from "@/modules/others"
import { computedEffect } from "@/utils/reactivity"

const props = defineProps<{
    authors: (SimpleAuthor & { isExported?: boolean })[]
    topics: (SimpleTopic & { isExported?: boolean })[]
    tags: (SimpleTag & { isExported?: boolean })[]
    direction?: "vertical" | "horizontal"
    max?: number
}>()

const callout = useCalloutService()

const navigator = useRouterNavigator()

const expand = ref(false)

const tags = computed(() => props.max !== undefined && !expand.value && props.tags.length > props.max ? props.tags.slice(0, props.max) : (props.tags ?? []))
const topics = computed(() => props.max !== undefined && !expand.value && props.topics.length > props.max ? props.topics.slice(0, props.max) : (props.topics ?? []))
const authors = computed(() => props.max !== undefined && !expand.value && props.authors.length > props.max ? props.authors.slice(0, props.max) : (props.authors ?? []))
const shouldCollapse = computed(() => props.max !== undefined && (props.tags.length > props.max || props.topics.length > props.max || props.authors.length > props.max))
const exported = computedEffect(() => props.tags.every(t => t.isExported) && props.topics.every(t => t.isExported) && props.authors.every(t => t.isExported))

const openMetaTagDetail = ({ type, value }: MetaTagTypeValue) => {
    if(type === "tag") navigator.goto({routeName: "MainTag", query: {detail: value.id}})
    else if(type === "topic") navigator.goto({routeName: "MainTopic", query: {detail: value.id}})
    else if(type === "author") navigator.goto({routeName: "MainAuthor", query: {detail: value.id}})
}
const openMetaTagDetailInNewWindow = ({ type, value }: MetaTagTypeValue) => {
    if(type === "tag") navigator.newWindow({routeName: "MainTag", query: {detail: value.id}})
    else if(type === "topic") navigator.newWindow({routeName: "MainTopic", query: {detail: value.id}})
    else if(type === "author") navigator.newWindow({routeName: "MainAuthor", query: {detail: value.id}})
}
const searchInIllusts = ({ type, value }: MetaTagTypeValue) => {
    if(type === "tag") navigator.goto({routeName: "MainIllust", params: {tagName: value.name}})
    else if(type === "topic") navigator.goto({routeName: "MainIllust", params: {topicName: value.name}})
    else if(type === "author") navigator.goto({routeName: "MainIllust", params: {authorName: value.name}})
}
const searchInBooks = ({ type, value }: MetaTagTypeValue) => {
    if(type === "tag") navigator.goto({routeName: "MainBook", params: {tagName: value.name}})
    else if(type === "topic") navigator.goto({routeName: "MainBook", params: {topicName: value.name}})
    else if(type === "author") navigator.goto({routeName: "MainBook", params: {authorName: value.name}})
}
const copyMetaTagName = ({ value }: MetaTagTypeValue) => writeClipboard(value.name)

const click = (e: MouseEvent, type: MetaTagTypes, value: MetaTagValues) => {
    callout.show({base: (e.target as Element).getBoundingClientRect(), callout: "metaTag", metaType: type, metaId: value.id})
}

const menu = usePopupMenu<MetaTagTypeValue>([
    {type: "normal", "label": "查看标签详情", click: openMetaTagDetail},
    {type: "normal", "label": "在新窗口中打开标签详情", click: openMetaTagDetailInNewWindow},
    {type: "separator"},
    {type: "normal", "label": "在图库中搜索", click: searchInIllusts},
    {type: "normal", "label": "在画集中搜索", click: searchInBooks},
    {type: "normal", "label": "复制此标签的名称", click: copyMetaTagName},
])

</script>

<template>
    <Group v-if="(tags.length || authors.length || topics.length) && direction === 'horizontal'" class="mt-1">
        <SimpleMetaTagElement v-for="author in authors" type="author" :value="author" @click="click($event, 'author', author)" @contextmenu="menu.popup({type: 'author', value: author})"/>
        <SimpleMetaTagElement v-for="topic in topics" type="topic" :value="topic" @click="click($event, 'topic', topic)" @contextmenu="menu.popup({type: 'topic', value: topic})"/>
        <SimpleMetaTagElement v-for="tag in tags" type="tag" :value="tag" @click="click($event, 'tag', tag)" @contextmenu="menu.popup({type: 'tag', value: tag})"/>
        <a v-if="shouldCollapse && !expand" class="no-wrap" @click="expand = true">查看全部<Icon class="ml-1" icon="angle-double-right"/></a>
    </Group>
    <div v-else-if="tags.length || authors.length || topics.length" class="relative">
        <SimpleMetaTagElement v-for="author in authors" class="mt-1" type="author" :value="author" wrapped-by-div @click="click($event, 'author', author)" @contextmenu="menu.popup({type: 'author', value: author})"/>
        <SimpleMetaTagElement v-for="topic in topics" class="mt-1" type="topic" :value="topic" wrapped-by-div @click="click($event, 'topic', topic)" @contextmenu="menu.popup({type: 'topic', value: topic})"/>
        <SimpleMetaTagElement v-for="tag in tags" class="mt-1" type="tag" :value="tag" wrapped-by-div @click="click($event, 'tag', tag)" @contextmenu="menu.popup({type: 'tag', value: tag})"/>
        <div v-if="shouldCollapse && !expand"><a class="no-wrap" @click="expand = true">查看全部<Icon class="ml-1" icon="angle-double-right"/></a></div>
        <Block v-if="exported" :class="[$style.exported, 'has-text-secondary']">EXPORTED</Block>
    </div>
    <div v-else class="has-text-secondary">
        <Icon icon="tag"/>
        <i>没有元数据标签</i>
    </div>
</template>

<style module lang="sass">
@import "../../styles/base/size"

.exported
    position: absolute
    right: 3px
    bottom: 2px
    padding: 0 2px
    font-size: $font-size-tiny
</style>