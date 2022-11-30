<script setup lang="ts">
import { computed } from "vue"
import { Group } from "@/components/layout"
import { TopicChildrenNode } from "@/functions/http-client/api/topic"
import { arrays } from "@/utils/primitives"
import ChildrenTreeModeItem from "./ChildrenTreeModeItem.vue"

const props = defineProps<{
    children: TopicChildrenNode[]
}>()

const emit = defineEmits<{
    (e: "click", topicId: number): void
}>()

const splits = computed(() => {
    const [characters, others] = arrays.filterInto(props.children, i => i.type === "CHARACTER")
    return {characters, others}
})
const anyChildren = computed(() => splits.value.others.some(child => child.children?.length))

</script>

<template>
    <div v-if="anyChildren">
        <div :class="$style.children">
            <Group v-for="child in splits.others" :key="child.id" :class="$style.child">
                <ChildrenTreeModeItem :child="child" @click="$emit('click', $event)"/>
            </Group>
        </div>
        <Group v-if="splits.characters.length > 0" :class="[$style.children, $style.inline]">
            <ChildrenTreeModeItem v-for="child in splits.characters" :key="child.id" :class="$style.child" :child="child" @click="$emit('click', $event)"/>
        </Group>
    </div>
    <Group v-else :class="[$style.children, $style.inline]">
        <ChildrenTreeModeItem v-for="child in [...splits.others, ...splits.characters]" :key="child.id" :class="$style.child" :child="child" @click="$emit('click', $event)"/>
    </Group>
</template>

<style module lang="sass">
.children
    &.inline

    .child
</style>
