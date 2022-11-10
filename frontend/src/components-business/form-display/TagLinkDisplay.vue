<script setup lang="ts">
import { Icon, Tag } from "@/components/universal"
import { Flex } from "@/components/layout"
import { TagNodeElement } from "@/components-business/element"
import { TagLink } from "@/functions/http-client/api/tag"

defineProps<{
    value: TagLink[]
}>()

defineEmits<{
    (e: "click", tagId: number): void
}>()

</script>

<template>
    <template v-if="value.length > 0">
        <Flex v-for="item in value">
            <Icon class="mr-1" icon="link"/>
            <TagNodeElement :node="item"/>
        </Flex>
    </template>
    <Flex v-else>
        <Icon class="has-text-secondary mr-1" icon="link"/>
        <Tag color="secondary"><i>没有链接的标签</i></Tag>
    </Flex>
</template>
