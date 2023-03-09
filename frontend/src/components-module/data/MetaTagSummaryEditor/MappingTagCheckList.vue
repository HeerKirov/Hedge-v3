<script setup lang="ts">
import { ref } from "vue"
import { Button } from "@/components/universal"
import { BottomLayout } from "@/components/layout"
import { MetaTagTypes, MetaTagTypeValue, MetaTagValues } from "@/functions/http-client/api/all"
import { BatchQueryResult, SourceMappingTargetDetail } from "@/functions/http-client/api/source-tag-mapping"
import MappingTagCheckListItem from "./MappingTagCheckListItem.vue"

const props = defineProps<{
    mappings: BatchQueryResult[]
    tagFilter: boolean
    topicFilter: boolean
    authorFilter: boolean
}>()

const emit = defineEmits<{
    (e: "add", value: MetaTagTypeValue[]): void
    (e: "update:sourceTagMapping", sourceTagCode: string, items: SourceMappingTargetDetail[]): void
}>()

const selected = ref<Record<string, boolean>>({})

const selectAll = () => {
    selected.value = {}
}

const selectNone = () => {
    for (const { code } of props.mappings) {
        selected.value[code] = false
    }
}

const selectReverse = () => {
    for (const { code } of props.mappings) {
        if(selected.value[code] as boolean | undefined === false) {
            delete selected.value[code]
        }else{
            selected.value[code] = false
        }
    }
}

const addAll = () => {
    const addList: MetaTagTypeValue[] = []
    for (const { code, mappings } of props.mappings) {
        if(selected.value[code] as boolean | undefined !== false) {
            for (const meta of mappings) {
                if(meta.metaType === "AUTHOR") {
                    if(props.authorFilter) {
                        addList.push({type: "author", value: meta.metaTag})
                    }
                }else if(meta.metaType === "TOPIC") {
                    if(props.topicFilter) {
                        addList.push({type: "topic", value: meta.metaTag})
                    }
                }else if(meta.metaType === "TAG") {
                    if(props.tagFilter) {
                        addList.push({type: "tag", value: meta.metaTag})
                    }
                }
            }
        }
    }
    if(addList.length) {
        emit("add", addList)
        selectNone()
    }
}

const addOne = (type: MetaTagTypes, value: MetaTagValues) => {
    emit("add", [{type, value} as MetaTagTypeValue])
}

const updateMappings = (sourceTagCode: string, mappings: SourceMappingTargetDetail[]) => {
    emit("update:sourceTagMapping", sourceTagCode, mappings)
}

</script>

<template>
    <BottomLayout>
        <div class="p-4">
            <table>
                <tbody>
                    <MappingTagCheckListItem v-for="item in mappings" :key="item.code"
                                             :author-filter="authorFilter"
                                             :topic-filter="topicFilter"
                                             :tag-filter="tagFilter"
                                             :mappings="item.mappings"
                                             :source-tag="item.sourceTag"
                                             :selected="selected[item.code] ?? true"
                                             @update:selected="selected[item.code] = $event"
                                             @update:mappings="updateMappings(item.code, $event)"
                                             @dblclick:one="addOne"/>
                </tbody>
            </table>
        </div>
        <template #bottom>
            <div class="mt-1 mr-4 mb-4 ml-1">
                <Button type="primary" icon="check-square" @click="selectAll">全选</Button>
                <Button type="primary" icon="check-square-regular" @click="selectReverse">反选</Button>
                <Button class="float-right" type="primary" icon="check-circle" @click="addAll">添加所选项</Button>
            </div>
        </template>
    </BottomLayout>
</template>
