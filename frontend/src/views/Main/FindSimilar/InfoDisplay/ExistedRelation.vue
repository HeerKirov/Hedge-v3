<script setup lang="ts">
import { Icon } from "@/components/universal"
import { FindSimilarResultRelation } from "@/functions/http-client/api/find-similar"
import { numbers } from "@/utils/primitives"

defineProps<{
    value: FindSimilarResultRelation
}>()

function sourceRelatedText(info: {sameBooks: number[], hasRelations: boolean}) {
    const r = info.hasRelations ? "关联项相关" : ""
    const b = info.sameBooks.length ? `同画集[${info.sameBooks.join(",")}]` : ""
    return r && b ? `${r}/${b}` : r || b
}

function similarityText(info: {similarity: number}) {
    return numbers.round2decimal(info.similarity * 100) + "%"
}

function existedText(info: { sameCollectionId: number | null, samePreCollection: string | null, sameBooks: number[], sameAssociate: boolean, ignored: boolean }) {
    const c = info.sameCollectionId !== null || info.samePreCollection !== null ? "同集合" : ""
    const b = info.sameBooks.length ? "同画集" : ""
    const a = info.sameAssociate ? "关联组相关" : ""
    const i = info.ignored ? "已忽略" : ""
    return [c, b, a, i].filter(i => !!i).join("/")
}

</script>

<template>
    <p v-if="value.type === 'SOURCE_IDENTITY_EQUAL'" class="has-text-warning"><Icon icon="equals"/>相同来源</p>
    <p v-else-if="value.type === 'SOURCE_IDENTITY_SIMILAR'" class="has-text-warning"><Icon icon="hand-lizard"/>相同来源，但分页不同</p>
    <p v-else-if="value.type === 'SOURCE_RELATED'" class="has-text-warning"><Icon icon="hand-scissors"/>来源项目有关联 ({{ sourceRelatedText(value.info) }})</p>
    <p v-else-if="value.type === 'RELATION_MARK_SAME'" class="has-text-danger"><Icon icon="marker"/>来源关系标记：相同</p>
    <p v-else-if="value.type === 'RELATION_MARK_SIMILAR'" class="has-text-danger"><Icon icon="lighlighter"/>来源关系标记：内容近似</p>
    <p v-else-if="value.type === 'RELATION_MARK_RELATED'" class="has-text-danger"><Icon icon="joint"/>来源关系标记：关系接近</p>
    <p v-else-if="value.type === 'HIGH_SIMILARITY'" class="has-text-success"><Icon icon="face-smile-beam"/>高相似度 ({{ similarityText(value.info) }})</p>
    <p v-else-if="value.type === 'TOO_HIGH_SIMILARITY'" class="has-text-success"><Icon icon="face-laugh-beam"/>极高相似度 ({{ similarityText(value.info) }})</p>
    <p v-else-if="value.type === 'EXISTED'" class="has-text-secondary"><Icon icon="check"/>已关联 ({{ existedText(value.info) }})</p>
</template>