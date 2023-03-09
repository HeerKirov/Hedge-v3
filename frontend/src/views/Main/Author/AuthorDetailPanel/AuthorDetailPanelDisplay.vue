<script setup lang="ts">
import { computed } from "vue"
import { Block, Icon, Tag } from "@/components/universal"
import { Group } from "@/components/layout"
import { DescriptionDisplay, RelatedAnnotationDisplay, ScoreDisplay, SourceTagMappingDisplay } from "@/components-business/form-display"
import { AUTHOR_TYPE_ICONS, AUTHOR_TYPE_NAMES } from "@/constants/entity"
import { DetailAuthor } from "@/functions/http-client/api/author"

const props = defineProps<{
    data: DetailAuthor
}>()

defineEmits<{
    (e: "click:author", authorId: number): void
}>()

const otherNameText = computed(() => props.data.otherNames.length > 0 ? props.data.otherNames.join(" / ") : null)

</script>

<template>
    <Block class="p-3">
        <p>
            <span :class="{'is-font-size-h4': true, [`has-text-${data.color}`]: !!data.color}">
                <Icon :icon="AUTHOR_TYPE_ICONS[data.type]"/>
                {{data.name}}
            </span>
            <span class="ml-2 has-text-secondary">{{otherNameText}}</span>
        </p>
        <p class="mt-4">
            <Icon :icon="AUTHOR_TYPE_ICONS[data.type]"/>
            {{AUTHOR_TYPE_NAMES[data.type]}}
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
    <Block v-if="data.mappingSourceTags?.length" class="p-3 mt-2">
        <label class="label mb-2"><Icon class="mr-1" icon="file-invoice"/>来源映射</label>
        <SourceTagMappingDisplay :value="data.mappingSourceTags"/>
    </Block>
    <!-- TODO 为author详情页添加examples, 包括topic那边 -->
</template>
