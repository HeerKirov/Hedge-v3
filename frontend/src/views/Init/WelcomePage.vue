<script setup lang="ts">
import { Button } from "@/components/universal"
import { BottomLayout } from "@/components/layout"

defineEmits<{
    (e: "next"): void
}>()

</script>

<template>
    <BottomLayout>
        <h3 class="mb-4">欢迎使用Hedge!</h3>
        <p>此向导将引导您完成初始化。这只包括几个简单的步骤。</p>
        <template #bottom>
            <Button class="float-right" type="primary" mode="filled" @click="$emit('next')">开始</Button>
        </template>
    </BottomLayout>
</template>
