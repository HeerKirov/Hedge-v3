<script setup lang="ts">
import { Tag, Icon } from "@/components/universal"
import { TopicChildrenNode } from "@/functions/http-client/api/topic"
import { useLocalStorage } from "@/functions/app"
import ChildrenListMode from "./ChildrenListMode.vue"
import ChildrenTreeMode from "./ChildrenTreeMode.vue"

const props = defineProps<{
    children: TopicChildrenNode[]
}>()

defineEmits<{
    (e: "click:topic", topicId: number): void
}>()

const childrenMode = useLocalStorage<"tree" | "list">("topic/detail-panel/children-view-mode", "tree")

</script>

<template>
    <div>
        <div class="mb-2 flex jc-between align-center">
            <label class="label"><Icon class="mr-1" icon="chess"/>子主题</label>
            <span>
                <Tag :color="childrenMode === 'tree' ? 'primary' : 'secondary'" icon="tree" line-style="none" clickable @click="childrenMode = 'tree'">树形视图</Tag>
                |
                <Tag :color="childrenMode === 'list' ? 'primary' : 'secondary'" icon="list" line-style="none" clickable @click="childrenMode = 'list'">列表视图</Tag>
            </span>
        </div>
        <ChildrenListMode v-if="childrenMode === 'list'" :children="children" @click="$emit('click:topic', $event)"/>
        <ChildrenTreeMode v-else :children="children" @click="$emit('click:topic', $event)"/>
    </div>
</template>