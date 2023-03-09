<script setup lang="ts">
import { computed } from "vue"
import { Tag, Icon } from "@/components/universal"
import { Group } from "@/components/layout"
import { DescriptionDisplay, RelatedAnnotationDisplay, ScoreDisplay } from "@/components-business/form-display"
import { AUTHOR_TYPE_ICONS } from "@/constants/entity"
import { toRef } from "@/utils/reactivity"
import { useAuthorDetailData } from "./context"

const props = defineProps<{
    authorId: number
}>()

const { data, toggleFavorite } = useAuthorDetailData(toRef(props, "authorId"))

const otherNameText = computed(() => data.value !== null && data.value.otherNames.length > 0 ? data.value.otherNames.join(" / ") : null)

</script>

<template>
    <template v-if="data !== null">
        <p class="mb-2">
            <span :class="{'is-font-size-h4': true, [`has-text-${data.color}`]: !!data.color}">
                <Icon :icon="AUTHOR_TYPE_ICONS[data.type]"/>
                {{data.name}}
            </span>
            <span class="ml-2 has-text-secondary">{{otherNameText}}</span>
            <Icon :class="`has-text-${data.favorite ? 'danger' : 'secondary'} float-right mt-2 mr-1`" icon="heart" @click="toggleFavorite"/>
        </p>
        <Group v-if="data.annotations.length || data.keywords.length">
            <RelatedAnnotationDisplay v-if="data.annotations.length > 0" :value="data.annotations"/>
            <Tag v-for="keyword in data.keywords" color="secondary">{{keyword}}</Tag>
            <ScoreDisplay v-if="data.score" class="float-right" :value="data.score"/>
        </Group>
        <p v-if="data.description">
            <DescriptionDisplay :value="data.description"/>
        </p>
    </template>
</template>
