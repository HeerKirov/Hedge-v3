<script setup lang="ts">
import { computed } from "vue"
import { Block, Icon, Tag } from "@/components/universal"
import { Flex, Group } from "@/components/layout"
import { SimpleMetaTagElement } from "@/components-business/element"
import { DescriptionDisplay, RelatedAnnotationDisplay, ScoreDisplay } from "@/components-business/form-display"
import { TOPIC_TYPE_ICONS, TOPIC_TYPE_NAMES } from "@/constants/entity"
import { DetailTopic } from "@/functions/http-client/api/topic"
import ChildrenTreeMode from "./ChildrenTreeMode.vue"
import ChildrenListMode from "./ChildrenListMode.vue"

const props = defineProps<{
    data: DetailTopic
    childrenMode?: "list" | "tree"
}>()

defineEmits<{
    (e: "update:childrenMode", v: "list" | "tree"): void
    (e: "click:topic", topicId: number): void
}>()

const otherNameText = computed(() => props.data.otherNames.length > 0 ? props.data.otherNames.join(" / ") : null)

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
            <ScoreDisplay class="float-right" :value="data.score"/>
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

</template>

<style module lang="sass">

</style>
