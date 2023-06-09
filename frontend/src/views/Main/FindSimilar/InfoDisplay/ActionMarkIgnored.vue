<script setup lang="ts">
import { Block, Button } from "@/components/universal"

defineEmits<{
    (e: "submit"): void
}>()

</script>

<template>
    <Block class="p-1">
        <p class="is-font-size-small">在后续的相似项查找中将两者视作存在关系，但不会产生实际关联。</p>
        <div class="mt-2 has-text-right">
            <Button size="small" mode="filled" type="warning" @click="$emit('submit')">确认</Button>
        </div>
    </Block>
</template>