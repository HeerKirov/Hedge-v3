<script setup lang="ts">
import { computed, ref } from "vue"
import { Select } from "@/components/form"
import { useEditorContext, useSuggestionData } from "./context"
import { SimpleTopic, SimpleAuthor, SimpleTag } from "@/functions/http-client/api/all"
import MetaTagCheckList from "./MetaTagCheckList.vue"

const { typeFilter, form: { addAll } } = useEditorContext()
const { selectList, suggestions } = useSuggestionData()

const selectedIndex = ref<number>(0)

const selectedSuggestion = computed<{topics: SimpleTopic[], authors: SimpleAuthor[], tags: SimpleTag[]} | undefined>(() => suggestions.value[selectedIndex.value])

const selectedValue = computed(() => selectList.value[selectedIndex.value]?.value)

const updateSelectedValue = (_: string, index: number) => {
    selectedIndex.value = index
}

//TODO 后端：关联组的推荐似乎有问题

</script>

<template>
    <template v-if="selectList.length > 0">
        <div class="mx-1">
            <Select size="small" :items="selectList" :value="selectedValue" @update:value="updateSelectedValue"/>
        </div>
        <MetaTagCheckList :tag-filter="typeFilter.tag"
                          :author-filter="typeFilter.author"
                          :topic-filter="typeFilter.topic"
                          :topics="selectedSuggestion?.topics ?? []"
                          :tags="selectedSuggestion?.tags ?? []"
                          :authors="selectedSuggestion?.authors ?? []"
                          @add="addAll"/>
    </template>
    <div v-else class="has-text-centered">
        <i class="secondary-text">没有可用于建议的相关项目</i>
    </div>
</template>
