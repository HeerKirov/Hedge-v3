<script setup lang="ts">
import { computed } from "vue"
import { Group, Flex } from "@/components/layout"
import { Tag, Icon, Starlight } from "@/components/universal"
import { SimpleMetaTagElement } from "@/components-business/element"
import { DescriptionDisplay, RelatedAnnotationDisplay } from "@/components-business/form-display"
import { TOPIC_TYPE_ICONS } from "@/constants/entity"
import { toRef } from "@/utils/reactivity"
import { useTopicDetailData } from "./context"

const props = defineProps<{
    topicId: number
}>()

const { data, toggleFavorite, setScore } = useTopicDetailData(toRef(props, "topicId"))

const otherNameText = computed(() => data.value !== null && data.value.otherNames.length > 0 ? data.value.otherNames.join(" / ") : null)

</script>

<template>
    <template v-if="data !== null">
        <p class="mb-2">
            <span :class="{'is-font-size-h4': true, [`has-text-${data.color}`]: !!data.color}">
                <Icon :icon="TOPIC_TYPE_ICONS[data.type]"/>
                {{data.name}}
            </span>
            <span class="ml-2 has-text-secondary">{{otherNameText}}</span>
            <Icon :class="`has-text-${data.favorite ? 'danger' : 'secondary'} is-cursor-pointer float-right mt-2 mr-1`" icon="heart" @click="toggleFavorite"/>
        </p>
        <Group v-if="data.parents.length" class="mb-2">
            <SimpleMetaTagElement v-for="topic in data.parents" :key="topic.id" type="topic" :value="topic"/>
        </Group>
        <Flex v-if="data.annotations.length || data.keywords.length || data.score" :multiline="true" :spacing="1">
            <RelatedAnnotationDisplay v-if="data.annotations.length > 0" :value="data.annotations"/>
            <Tag v-for="keyword in data.keywords" color="secondary">{{keyword}}</Tag>
            <Starlight v-if="data.score" class="ml-auto" show-text editable :value="data.score" @update:value="setScore"/>
        </Flex>
        <DescriptionDisplay v-if="data.description" class="mt-1" :value="data.description"/>
    </template>
</template>
