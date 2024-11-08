<script setup lang="ts">
import { ref } from "vue"
import { Tag, Block } from "@/components/universal"
import { Group } from "@/components/layout"
import { SearchPickList } from "@/components/data"
import { ElementPopupCallout } from "@/components/interaction"
import { AnnotationElement } from "@/components-business/element"
import { HttpClient } from "@/functions/http-client"
import { Annotation, AnnotationTarget, SimpleAnnotation } from "@/functions/http-client/api/annotations"
import { MetaType } from "@/functions/http-client/api/all"

const props = defineProps<{
    value: SimpleAnnotation[]
    metaType: MetaType
    target?: AnnotationTarget
    mode?: "popup" | "embedded"
}>()

const emit = defineEmits<{
    (e: "update:value", value: SimpleAnnotation[]): void
}>()

const embeddedSwitch = ref(false)

const searchProps = {
    autoFocus: true,
    query: (client: HttpClient) => (offset: number, limit: number, search: string) => client.annotation.list({offset, limit, query: search, type: props.metaType, target: props.target}),
    historyList: (client: HttpClient) => (_: number) => client.searchUtil.history.annotations(props.metaType),
    historyPush: (client: HttpClient) => (item: Annotation) => client.searchUtil.history.push({type: `ANNOTATION:${item.type}`, id: item.id}),
    mapOption: (item: Annotation) => ({label: item.name, value: `${item.id}`}),
    onPick: (item: Annotation) => {
        if(!props.value.some(i => i.id === item.id)) {
            emit("update:value", [...props.value, {id: item.id, name: item.name}])
        }
    }
}

const removeItem = (idx: number) => {
    emit("update:value", [...props.value.slice(0, idx), ...props.value.slice(idx + 1)])
}

</script>

<template>
    <Group>
        <span v-for="(item, idx) in value" class="mr-1 mb-1">
            <AnnotationElement :value="item"/>
            <Tag icon="close" line-style="none" clickable @click="removeItem(idx)"/>
        </span>
        <Tag v-if="mode === 'embedded'" color="success" icon="plus" clickable @click="embeddedSwitch = !embeddedSwitch">添加注解</Tag>
        <ElementPopupCallout v-else>
            <template #default="{ click }">
                <Tag color="success" icon="plus" clickable @click="click">添加注解</Tag>
            </template>
            <template #popup>
                <SearchPickList :class="$style.popup" v-bind="searchProps" v-slot="{ item }">
                    <AnnotationElement :value="item"/>
                </SearchPickList>
            </template>
        </ElementPopupCallout>
    </Group>
    <Block v-if="mode === 'embedded' && embeddedSwitch" class="mt-1">
        <SearchPickList :class="$style.popup" v-bind="searchProps" v-slot="{ item }">
            <AnnotationElement :value="item"/>
        </SearchPickList>
    </Block>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.popup
    max-width: 450px
    min-width: 200px
    padding: size.$spacing-2
</style>
