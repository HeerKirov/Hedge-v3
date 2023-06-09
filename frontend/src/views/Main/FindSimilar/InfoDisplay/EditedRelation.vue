<script setup lang="ts">
import { Icon } from "@/components/universal"
import { useFindSimilarDetailPanel } from "@/services/main/find-similar"

defineProps<{
    value: ReturnType<typeof useFindSimilarDetailPanel>["display"]["editedRelations"]["value"][number]
}>()

</script>

<template>
    <p v-if="value.type === 'CLONE_IMAGE'" :class="value.deleteFrom ? 'has-text-primary' : 'has-text-danger'"><Icon icon="clone"/>{{ value.direction }} 属性克隆{{ value.deleteFrom ? '(删除源)' : '' }}</p>
    <p v-else-if="value.type === 'ADD_TO_COLLECTION'" class="has-text-success"><Icon icon="images"/>{{ value.goal }} 加入集合 {{ value.collectionId }}</p>
    <p v-else-if="value.type === 'ADD_TO_BOOK'" class="has-text-success"><Icon icon="images"/>{{ value.goal }} 加入画集 {{ value.bookId }}</p>
    <p v-else-if="value.type === 'MARK_IGNORED'" class="has-text-warning"><Icon icon="link-slash"/>忽略</p>
    <p v-else-if="value.type === 'DELETE'" class="has-text-danger"><Icon icon="images"/>{{ value.goal }} 删除</p>
</template>