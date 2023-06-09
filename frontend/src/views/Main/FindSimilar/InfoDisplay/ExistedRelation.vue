<script setup lang="ts">
import { Icon } from "@/components/universal"
import { FindSimilarResultRelation } from "@/functions/http-client/api/find-similar"

defineProps<{
    value: FindSimilarResultRelation
}>()

</script>

<template>
    <p v-if="value.type === 'SOURCE_IDENTITY_EQUAL'" class="has-text-warning"><Icon icon="equals"/>来源一致</p>
    <p v-else-if="value.type === 'SOURCE_IDENTITY_SIMILAR'" class="has-text-warning"><Icon icon="hand-lizard"/>来源项目一致但Part不同</p>
    <p v-else-if="value.type === 'SOURCE_RELATED'" class="has-text-warning"><Icon icon="hand-scissors"/>来源项目有关联</p>
    <p v-else-if="value.type === 'RELATION_MARK_SAME'" class="has-text-danger"><Icon icon="marker"/>来源关系标记：相同</p>
    <p v-else-if="value.type === 'RELATION_MARK_SIMILAR'" class="has-text-danger"><Icon icon="lighlighter"/>来源关系标记：内容近似</p>
    <p v-else-if="value.type === 'RELATION_MARK_RELATED'" class="has-text-danger"><Icon icon="joint"/>来源关系标记：关系接近</p>
    <p v-else-if="value.type === 'HIGH_SIMILARITY'" class="has-text-success"><Icon icon="face-smile-beam"/>高相似度</p>
    <p v-else-if="value.type === 'TOO_HIGH_SIMILARITY'" class="has-text-success"><Icon icon="face-laugh-beam"/>极高相似度</p>
    <p v-else-if="value.type === 'EXISTED'" class="has-text-secondary"><Icon icon="check"/>已关联</p>
</template>