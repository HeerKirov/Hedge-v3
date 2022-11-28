<script setup lang="ts">
import { SearchPickList } from "@/components/data"
import { Tag } from "@/components/universal"
import { ElementPopupCallout } from "@/components/interaction"
import { SimpleMetaTagElement } from "@/components-business/element"
import { HttpClient } from "@/functions/http-client"
import { ParentTopic, Topic } from "@/functions/http-client/api/topic"

const props = defineProps<{
    value: ParentTopic | null
}>()

const emit = defineEmits<{
    (e: "update:value", v: ParentTopic | null): void
}>()

const NOT_SELECTED: ParentTopic = {
    id: -1,
    name: "未选择",
    type: "UNKNOWN",
    color: null
}

const searchProps = {
    autoFocus: true,
    query: (client: HttpClient) => (offset: number, limit: number, search: string) => client.topic.list({offset, limit, query: search, order: "-updateTime"}),
    historyList: (client: HttpClient) => client.searchUtil.history.topics,
    historyPush: (client: HttpClient) => (item: Topic) => client.searchUtil.history.push({type: "TOPIC", id: item.id}),
    mapOption: (item: Topic) => ({label: item.name, value: `${item.id}`}),
    onPick: (item: Topic) => {
        if(props.value?.id !== item.id) {
            emit("update:value", {id: item.id, name: item.name, type: item.type, color: item.color})
        }
    }
}

</script>

<template>
    <div>
        <ElementPopupCallout>
            <template #default="{ click }">
                <SimpleMetaTagElement type="topic" :value="value ?? NOT_SELECTED" clickable @click="click"/>
            </template>

            <template #popup>
                <SearchPickList :class="$style.popup" v-bind="searchProps" v-slot="{ item }">
                    <SimpleMetaTagElement type="topic" :value="item"/>
                </SearchPickList>
            </template>
        </ElementPopupCallout>
        <Tag v-if="value !== null" icon="close" line-style="none" clickable @click="$emit('update:value', null)"/>
    </div>
</template>

<style module lang="sass">
@import "../../styles/base/size"

.popup
    max-width: 450px
    min-width: 200px
    padding: $spacing-2
</style>

