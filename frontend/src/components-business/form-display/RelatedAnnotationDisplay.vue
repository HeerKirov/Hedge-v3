<script setup lang="ts">
import { Tag } from "@/components/universal"
import { AnnotationElement } from "@/components-business/element"
import { SimpleAnnotation } from "@/functions/http-client/api/annotations"

defineProps<{
    value: SimpleAnnotation[]
}>()

</script>

<template>
    <template v-if="value.length > 0">
        <AnnotationElement v-for="item in value" :value="item"/>
    </template>
    <i v-else>
        <Tag brackets="[]" color="secondary">没有注解</Tag>
    </i>
</template>
