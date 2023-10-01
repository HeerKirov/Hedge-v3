<script setup lang="ts" generic="T">
import { Button } from "@/components/universal"
import { Flex, FlexItem } from "@/components/layout"
import { Colors } from "@/constants/ui"

defineProps<{
    items: {value: T, label: string, icon: string}[]
    value?: T
    mode?: "transparent" | "light" | "filled"
    type?: Colors
    size?: "std" | "small" | "large"
}>()

defineEmits<{
    (e: "update:value", v: T): void
}>()

</script>

<template>
    <Flex>
        <FlexItem v-for="item in items" :width="value === item.value ? 100 : undefined" :shrink="value === item.value ? undefined : 0">
            <Button :icon="item.icon" :size="size"
                    :class="value === item.value ? 'px-2 no-wrap overflow-ellipsis' : ''"
                    :mode="mode && value === item.value ? mode : undefined"
                    :type="type && value === item.value ? type : undefined"
                    :square="value !== item.value"
                    @click="$emit('update:value', item.value)">
                {{value === item.value ? item.label : null}}
            </Button>
        </FlexItem>
    </Flex>
</template>
