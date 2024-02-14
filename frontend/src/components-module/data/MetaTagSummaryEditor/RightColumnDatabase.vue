<script setup lang="ts">
import { Input } from "@/components/form"
import { Button } from "@/components/universal"
import { Flex, FlexItem } from "@/components/layout"
import { SimpleMetaTagElement } from "@/components-business/element"
import { SearchResultInfo } from "@/components-business/top-bar"
import { TagTree } from "@/components-module/data"
import { MetaTagTypes, MetaTagValues } from "@/functions/http-client/api/all"
import { TagTreeNode } from "@/functions/http-client/api/tag"
import { META_TYPE_ICONS } from "@/constants/entity"
import { useCalloutService } from "@/components-module/callout"
import { useDatabaseData, useEditorContext } from "./context"

const callout = useCalloutService()

const { form: { add } } = useEditorContext()
const {
    tabDBType, searchText, selectedIndex,
    authorData, authorShowMore, authorNext,
    topicData, topicShowMore, topicNext,
    tagData, tagSearch: { searchInfo: tagSearchInfo, tagTreeRef, prev: tagSearchPrev, next: tagSearchNext },
    inputKeypress, refresh
} = useDatabaseData()

const click = (e: MouseEvent, type: MetaTagTypes, value: MetaTagValues) => {
    callout.show({base: (e.target as Element).getBoundingClientRect(), callout: "metaTag", metaType: type, metaId: value.id})
}

const clickTag = (tag: TagTreeNode, _: unknown, __: unknown, e: MouseEvent) => {
    callout.show({base: (e.target as Element).getBoundingClientRect(), callout: "metaTag", metaType: "tag", metaId: tag.id})
}

const addTag = (tag: TagTreeNode) => {
    add("tag", {id: tag.id, name: tag.name, color: tag.color})
}

</script>

<template>
    <Flex class="ml-2 mt-1" horizontal="stretch" :spacing="1">
        <FlexItem :shrink="0">
            <Button size="small" :type="tabDBType === 'author' ? 'primary' : undefined" :icon="META_TYPE_ICONS['AUTHOR']" @click="tabDBType = 'author'">作者</Button>
            <Button size="small" :type="tabDBType === 'topic' ? 'primary' : undefined" :icon="META_TYPE_ICONS['TOPIC']" @click="tabDBType = 'topic'">主题</Button>
            <Button size="small" :type="tabDBType === 'tag' ? 'primary' : undefined" :icon="META_TYPE_ICONS['TAG']" @click="tabDBType = 'tag'">标签</Button>
        </FlexItem>
        <Input width="fullwidth" size="small" placeholder="搜索数据库" focus-on-keypress="Meta+KeyF" update-on-input v-model:value="searchText" @keypress="inputKeypress"/>
        <SearchResultInfo v-if="tabDBType === 'tag' && tagSearchInfo !== null" size="small" v-bind="tagSearchInfo" @prev="tagSearchPrev" @next="tagSearchNext"/>
        <FlexItem :shrink="0">
            <Button size="small" type="primary" square icon="sync-alt" @click="refresh"/>
        </FlexItem>
    </Flex>
    <div v-if="tabDBType === 'author'" :class="$style.content">
        <SimpleMetaTagElement v-for="(author, idx) in authorData.result" :class="{[$style.item]: true, [$style.selected]: selectedIndex === idx}" type="author" :value="author" wrapped-by-div draggable @click="click($event, 'author', author)" @dblclick="add('author', author)"/>
        <a v-if="authorShowMore" @click="authorNext">加载更多…</a>
    </div>
    <div v-else-if="tabDBType === 'topic'"  :class="$style.content">
        <SimpleMetaTagElement v-for="(topic, idx) in topicData.result" :class="{[$style.item]: true, [$style.selected]: selectedIndex === idx}" type="topic" :value="topic" wrapped-by-div draggable @click="click($event, 'topic', topic)" @dblclick="add('topic', topic)">
            <template #behind>
                <span v-if="topic.parentRoot !== null" :class="['has-text-secondary', $style['parent-root']]">[{{topic.parentRoot.name}}]</span>
            </template>
        </SimpleMetaTagElement>
        <a v-if="topicShowMore" @click="topicNext">加载更多…</a>
    </div>
    <div v-else :class="$style.content">
        <TagTree v-if="tagData?.length" ref="tagTreeRef" :tags="tagData" draggable disable-root-node @click="clickTag" @dblclick="addTag"/>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/color"
@import "../../../styles/base/size"

.content
    height: 100%
    overflow-y: auto
    padding: 1rem

.item
    padding: $spacing-half $spacing-1

.selected
    border-radius: $radius-size-std
    @media (prefers-color-scheme: light)
        border: solid 2px $light-mode-warning
    @media (prefers-color-scheme: dark)
        border: solid 2px $dark-mode-warning

.parent-root
    vertical-align: bottom
    margin-left: $spacing-1
    font-size: $font-size-tiny
</style>
