<script setup lang="ts">
import { computed } from "vue"
import { Block, Icon, Tag, GridImages } from "@/components/universal"
import { Group } from "@/components/layout"
import { DescriptionDisplay, RelatedAnnotationDisplay, ScoreDisplay, SourceTagMappingDisplay } from "@/components-business/form-display"
import { DetailAuthor } from "@/functions/http-client/api/author"
import { Illust } from "@/functions/http-client/api/illust"
import { AUTHOR_TYPE_ICONS, AUTHOR_TYPE_NAMES } from "@/constants/entity"
import { useRouterNavigator } from "@/modules/router"

const props = defineProps<{
    data: DetailAuthor
    examples?: Illust[] | null
}>()

defineEmits<{
    (e: "click:author", authorId: number): void
}>()

const navigator = useRouterNavigator()

const otherNameText = computed(() => props.data.otherNames.length > 0 ? props.data.otherNames.join(" / ") : null)

const exampleImages = computed(() => props.examples?.map(ex => ex.thumbnailFile) ?? [])

const more = () => navigator.goto({routeName: "MainIllust", params: {authorName: props.data.name}})

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
    <template v-if="exampleImages.length > 0">
        <GridImages class="mt-2" :column-num="5" :images="exampleImages"/>
        <a class="float-right" @click="more">在图库搜索"{{data.name}}"的全部项目<Icon class="ml-1" icon="angle-double-right"/></a>
    </template>
</template>
