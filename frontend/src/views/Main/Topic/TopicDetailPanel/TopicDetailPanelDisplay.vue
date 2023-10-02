<script setup lang="ts">
import { computed } from "vue"
import { Block, Icon, Tag, GridImages, Starlight } from "@/components/universal"
import { Flex, Group } from "@/components/layout"
import { SimpleMetaTagElement } from "@/components-business/element"
import { DescriptionDisplay, RelatedAnnotationDisplay, SourceTagMappingDisplay } from "@/components-business/form-display"
import { Illust } from "@/functions/http-client/api/illust"
import { DetailTopic } from "@/functions/http-client/api/topic"
import { TOPIC_TYPE_ICONS, TOPIC_TYPE_NAMES } from "@/constants/entity"
import { useRouterNavigator } from "@/modules/router"
import ChildrenTreeMode from "./ChildrenTreeMode.vue"
import ChildrenListMode from "./ChildrenListMode.vue"

const props = defineProps<{
    data: DetailTopic
    childrenMode?: "list" | "tree"
    examples?: Illust[] | null
}>()

defineEmits<{
    (e: "update:childrenMode", v: "list" | "tree"): void
    (e: "click:topic", topicId: number): void
}>()

const navigator = useRouterNavigator()

const otherNameText = computed(() => props.data.otherNames.length > 0 ? props.data.otherNames.join(" / ") : null)

const exampleImages = computed(() => props.examples?.map(ex => ex.filePath.sample) ?? [])

const more = () => navigator.goto({routeName: "MainIllust", params: {topicName: props.data.name}})

</script>

<template>
    <Block class="p-3">
        <p>
            <span :class="{'is-font-size-h4': true, [`has-text-${data.color}`]: !!data.color}">
                <Icon :icon="TOPIC_TYPE_ICONS[data.type]"/>
                {{data.name}}
            </span>
            <span class="ml-2 has-text-secondary">{{otherNameText}}</span>
        </p>
        <p class="mt-4">
            <Icon :icon="TOPIC_TYPE_ICONS[data.type]"/>
            {{TOPIC_TYPE_NAMES[data.type]}}
            <Starlight class="float-right" :value="data.score"/>
        </p>
        <p class="mt-1">
            <DescriptionDisplay :value="data.description"/>
        </p>
        <Group class="mt-1">
            <RelatedAnnotationDisplay v-if="data.annotations.length > 0" :value="data.annotations"/>
            <Tag v-for="keyword in data.keywords" color="secondary">{{keyword}}</Tag>
        </Group>
    </Block>
    <Block v-if="data.children?.length || data.parents.length" class="p-3 mt-2">
        <template v-if="data.parents.length">
            <label class="label mb-2"><Icon class="mr-1" icon="chess-queen"/>父主题</label>
            <Group>
                <SimpleMetaTagElement v-for="topic in data.parents" :key="topic.id" type="topic" :value="topic" clickable/>
            </Group>
        </template>
        <template v-if="data.children?.length">
            <Flex :class="data.parents.length ? 'my-2' : 'mb-2'" horizontal="stretch" align="center">
                <label class="label"><Icon class="mr-1" icon="chess"/>子主题</label>
                <span>
                    <Tag :color="childrenMode === 'tree' ? 'primary' : 'secondary'" icon="tree" line-style="none" clickable @click="$emit('update:childrenMode', 'tree')">树形视图</Tag>
                    |
                    <Tag :color="childrenMode === 'list' ? 'primary' : 'secondary'" icon="list" line-style="none" clickable @click="$emit('update:childrenMode', 'list')">列表视图</Tag>
                </span>
            </Flex>
            <ChildrenListMode v-if="childrenMode === 'list'" :children="data.children" @click="$emit('click:topic', $event)"/>
            <ChildrenTreeMode v-else :children="data.children" @click="$emit('click:topic', $event)"/>
        </template>
    </Block>
    <Block v-if="data.mappingSourceTags?.length" class="p-3 mt-2">
        <label class="label mb-2"><Icon class="mr-1" icon="file-invoice"/>来源映射</label>
        <SourceTagMappingDisplay :value="data.mappingSourceTags"/>
    </Block>
    <template v-if="exampleImages.length > 0">
        <GridImages class="mt-2" :column-num="5" :images="exampleImages"/>
        <a class="float-right" @click="more">在图库搜索"{{data.name}}"的全部项目<Icon class="ml-1" icon="angle-double-right"/></a>
    </template>
</template>

<style module lang="sass">

</style>
