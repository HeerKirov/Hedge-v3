<script setup lang="ts">
import { ref } from "vue"
import { Button } from "@/components/universal"
import { MetaTagTypes, MetaTagTypeValue, MetaTagValues } from "@/functions/http-client/api/all"
import { BatchQueryResult, SourceMappingTargetDetail } from "@/functions/http-client/api/source-tag-mapping"
import MappingTagCheckListItem from "./MappingTagCheckListItem.vue"

const props = defineProps<{
    mappings: BatchQueryResult[]
    primitiveMode: boolean
    tagFilter: boolean
    topicFilter: boolean
    authorFilter: boolean
}>()

const emit = defineEmits<{
    (e: "add", value: (MetaTagTypeValue | {type: "mapping", mapping: BatchQueryResult})[]): void
    (e: "update:sourceTagMapping", sourceTagType: string, sourceTagCode: string, items: SourceMappingTargetDetail[]): void
}>()

const selected = ref<Record<string, boolean>>({})

const selectAll = () => {
    selected.value = {}
}

const selectNone = () => {
    for (const { site, type, code } of props.mappings) {
        selected.value[`${site}/${type}/${code}`] = false
    }
}

const selectReverse = () => {
    for (const { site, type, code } of props.mappings) {
        const key = `${site}/${type}/${code}`
        if(selected.value[key] as boolean | undefined === false) {
            delete selected.value[key]
        }else{
            selected.value[key] = false
        }
    }
}

const addAll = () => {
    const addList: (MetaTagTypeValue | {type: "mapping", mapping: BatchQueryResult})[] = []
    for (const item of props.mappings) {
        if(selected.value[`${item.site}/${item.type}/${item.code}`] as boolean | undefined !== false) {
            if(props.primitiveMode) {
                if(item.mappings.length > 0) {
                    addList.push({type: "mapping", mapping: item})
                }
            }else for (const meta of item.mappings) {
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

const updateMappings = (sourceTagType: string, sourceTagCode: string, mappings: SourceMappingTargetDetail[]) => {
    emit("update:sourceTagMapping", sourceTagType, sourceTagCode, mappings)
}

</script>

<template>
    <div class="p-4 is-overflow-y-auto h-100">
        <table>
            <tbody>
                <MappingTagCheckListItem v-for="item in mappings" :key="`${item.site}/${item.type}/${item.code}`"
                                         :author-filter="authorFilter"
                                         :topic-filter="topicFilter"
                                         :tag-filter="tagFilter"
                                         :mappings="item.mappings"
                                         :source-tag="item.sourceTag"
                                         :selected="selected[`${item.site}/${item.type}/${item.code}`] ?? true"
                                         @update:selected="selected[`${item.site}/${item.type}/${item.code}`] = $event"
                                         @update:mappings="updateMappings(item.type, item.code, $event)"
                                         @dblclick:one="addOne"/>
            </tbody>
        </table>
    </div>
    <div class="mt-1 mr-4 mb-4 ml-1">
        <Button type="primary" icon="check-square" @click="selectAll">全选</Button>
        <Button type="primary" icon="check-square-regular" @click="selectReverse">反选</Button>
        <Button class="float-right" type="primary" icon="check-circle" @click="addAll">添加所选项</Button>
    </div>
</template>
