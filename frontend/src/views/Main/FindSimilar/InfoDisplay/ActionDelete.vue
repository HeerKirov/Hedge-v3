<script setup lang="ts">
import { ref } from "vue"
import { Block, Button, Tag } from "@/components/universal"
import { Group } from "@/components/layout"

defineProps<{
    mode: "COMPARE" | "MULTIPLE"
}>()

defineEmits<{
    (e: "submit", choice: "A" | "B" | "A&B"): void
}>()

const choice = ref<"A" | "B" | "A&B">("A")

</script>

<template>
    <Block v-if="mode === 'COMPARE'" class="p-1">
        要将谁标记为删除？
        <Group class="mt-2">
            <Tag :color="choice === 'A' ? 'danger' : undefined" :icon="choice === 'A' ? 'check' : undefined" clickable @click="choice = 'A'">删除A</Tag>
            <Tag :color="choice === 'B' ? 'danger' : undefined" :icon="choice === 'B' ? 'check' : undefined" clickable @click="choice = 'B'">删除B</Tag>
            <Tag :color="choice === 'A&B' ? 'danger' : undefined" :icon="choice === 'A&B' ? 'check' : undefined" clickable @click="choice = 'A&B'">删除A与B</Tag>
        </Group>
        <div class="mt-1 has-text-right">
            <Button size="small" mode="filled" type="danger" @click="$emit('submit', choice)">确认</Button>
        </div>
    </Block>
    <Block v-else class="p-1">
        将所有选择项标记为删除。
        <div class="mt-1 has-text-right">
            <Button size="small" mode="filled" type="danger" @click="$emit('submit', 'A&B')">确认</Button>
        </div>
    </Block>
</template>