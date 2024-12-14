<script setup lang="ts">
import { ref } from "vue"
import { Tag, Block } from "@/components/universal"
import { Group } from "@/components/layout"
import { SearchPickList } from "@/components/data"
import { ElementPopupCallout } from "@/components/interaction"
import { SimpleMetaTagElement } from "@/components-business/element"
import { HttpClient } from "@/functions/http-client"
import { SimpleTopic } from "@/functions/http-client/api/all"

const props = defineProps<{
    value: SimpleTopic[]
    mode?: "popup" | "embedded"
}>()

const emit = defineEmits<{
    (e: "update:value", value: SimpleTopic[]): void
}>()

const embeddedSwitch = ref(false)

const searchProps = {
    autoFocus: true,
    query: (client: HttpClient) => (offset: number, limit: number, search: string) => client.topic.list({offset, limit, query: search, order: "-updateTime"}),
    historyList: (client: HttpClient) => client.searchUtil.history.topics,
    historyPush: (client: HttpClient) => (item: SimpleTopic) => client.searchUtil.history.push({type: "TOPIC", id: item.id}),
    mapOption: (item: SimpleTopic) => ({label: item.name, value: `${item.id}`}),
    onPick: (item: SimpleTopic) => {
        if(!props.value.some(i => i.id === item.id)) {
            emit("update:value", [...props.value, {id: item.id, name: item.name, type: item.type, color: item.color}])
        }
    }
}

const removeItem = (idx: number) => {
    emit("update:value", [...props.value.slice(0, idx), ...props.value.slice(idx + 1)])
}

</script>

<template>
    <Group>
        <span v-for="(item, idx) in value">
            <SimpleMetaTagElement type="topic" :value="item"/>
            <Tag icon="close" line-style="none" clickable @click="removeItem(idx)"/>
        </span>
        <Tag v-if="mode === 'embedded'" color="success" icon="plus" clickable @click="embeddedSwitch = !embeddedSwitch">添加主题</Tag>
        <ElementPopupCallout v-else>
            <template #default="{ click }">
                <Tag color="success" icon="plus" clickable @click="click">添加主题</Tag>
            </template>
            <template #popup>
                <SearchPickList :class="$style.popup" v-bind="searchProps" v-slot="{ item }">
                    <SimpleMetaTagElement type="topic" :value="item"/>
                </SearchPickList>
            </template>
        </ElementPopupCallout>
    </Group>
    <Block v-if="mode === 'embedded' && embeddedSwitch" :class="$style.embedded">
        <SearchPickList :class="$style.popup" v-bind="searchProps" v-slot="{ item }">
            <SimpleMetaTagElement type="topic" :value="item"/>
        </SearchPickList>
    </Block>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.embedded
    max-width: 400px
    min-width: 200px
    margin-top: size.$spacing-1
.popup
    max-width: 400px
    min-width: 200px
    padding: size.$spacing-2
</style>
