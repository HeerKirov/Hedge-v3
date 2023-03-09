<script setup lang="ts">
import { Input } from "@/components/form"
import { Button } from "@/components/universal"
import { Flex, FlexItem } from "@/components/layout"
import { SimpleMetaTagElement } from "@/components-business/element"
import { SearchResultInfo } from "@/components-business/top-bar"
import { TagTree } from "@/components-module/data"
import { TagTreeNode } from "@/functions/http-client/api/tag"
import { META_TYPE_ICONS } from "@/constants/entity"
import { useDatabaseData, useEditorContext } from "./context"

const { form: { add } } = useEditorContext()
const {
    tabDBType,
    authorData, authorShowMore, authorNext, authorSearchText,
    topicData, topicShowMore, topicNext, topicSearchText,
    tagData, tagSearch: { searchText: tagSearchText, searchInfo: tagSearchInfo, tagTreeRef, prev: tagSearchPrev, next: tagSearchNext },
    refresh
} = useDatabaseData()

const updateTagSearchText = (v: string) => {
    const s = v.trim()
    if(s === tagSearchText.value) {
        tagSearchNext()
    }else{
        tagSearchText.value = s
    }
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
        <Input v-if="tabDBType === 'author'" width="fullwidth" size="small" placeholder="搜索数据库" v-model:value="authorSearchText"/>
        <Input v-else-if="tabDBType === 'topic'" width="fullwidth" size="small" placeholder="搜索数据库" v-model:value="topicSearchText"/>
        <template v-else>
            <Input width="fullwidth" size="small" placeholder="搜索数据库" :value="tagSearchText" @update:value="updateTagSearchText"/>
            <FlexItem :shrink="0">
                <SearchResultInfo v-if="tagSearchInfo !== null" size="small" v-bind="tagSearchInfo" @prev="tagSearchPrev" @next="tagSearchNext"/>
            </FlexItem>
        </template>
        <FlexItem :shrink="0">
            <Button size="small" type="primary" square icon="sync-alt" @click="refresh"/>
        </FlexItem>
    </Flex>
    <div v-if="tabDBType === 'author'" :class="$style.content">
        <SimpleMetaTagElement v-for="author in authorData.result" class="mb-1" type="author" :value="author" wrapped-by-div draggable @dblclick="add('author', author)"/>
        <a v-if="authorShowMore" @click="authorNext">加载更多…</a>
    </div>
    <div v-else-if="tabDBType === 'topic'"  :class="$style.content">
        <SimpleMetaTagElement v-for="topic in topicData.result" class="mb-1" type="topic" :value="topic" wrapped-by-div draggable @dblclick="add('topic', topic)"/>
        <a v-if="topicShowMore" @click="topicNext">加载更多…</a>
    </div>
    <div v-else :class="$style.content">
        <TagTree v-if="tagData?.length" ref="tagTreeRef" :tags="tagData" draggable disable-root-node @dblclick="addTag"/>
    </div>
</template>

<style module lang="sass">
.content
    height: 100%
    overflow-y: auto
    padding: 1rem
</style>
