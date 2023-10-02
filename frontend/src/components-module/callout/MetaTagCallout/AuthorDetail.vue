<script setup lang="ts">
import { computed } from "vue"
import { Tag, Icon, Starlight } from "@/components/universal"
import { Flex } from "@/components/layout"
import { DescriptionDisplay, RelatedAnnotationDisplay } from "@/components-business/form-display"
import { AUTHOR_TYPE_ICONS } from "@/constants/entity"
import { toRef } from "@/utils/reactivity"
import { useAuthorDetailData } from "./context"

const props = defineProps<{
    authorId: number
}>()

const { data, toggleFavorite, setScore } = useAuthorDetailData(toRef(props, "authorId"))

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
            <Icon :class="`has-text-${data.favorite ? 'danger' : 'secondary'} is-cursor-pointer float-right mt-2 mr-1`" icon="heart" @click="toggleFavorite"/>
        </p>
        <Flex v-if="data.annotations.length || data.keywords.length || data.score" :multiline="true" :spacing="1">
            <RelatedAnnotationDisplay v-if="data.annotations.length > 0" :value="data.annotations"/>
            <Tag v-for="keyword in data.keywords" color="secondary">{{keyword}}</Tag>
            <Starlight v-if="data.score" class="ml-auto" show-text editable :value="data.score" @update:value="setScore"/>
        </Flex>
        <p v-if="data.description">
            <DescriptionDisplay :value="data.description"/>
        </p>
    </template>
</template>
