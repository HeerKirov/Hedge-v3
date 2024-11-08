<script setup lang="ts" generic="T">
import { Button } from "@/components/universal"
import { Flex } from "@/components/layout"
import { Colors } from "@/constants/ui"
import { useDarwinWindowed } from "@/functions/app"

const props = defineProps<{
    items: {value: T, label: string, icon: string, visible?: boolean}[]
    value?: T
    mode?: "transparent" | "light" | "filled"
    type?: Colors
    size?: "std" | "small" | "large"
    enableDarwinBorder?: boolean
}>()

defineEmits<{
    (e: "update:value", v: T): void
}>()

const hasDarwinBorder = props.enableDarwinBorder ? useDarwinWindowed() : undefined

</script>

<template>
    <Flex>
        <template v-for="item in items" :key="item.label">
            <Button v-if="item.visible === undefined || item.visible"
                    :icon="item.icon" :size="size"
                    :style="{width: value === item.value ? '100%' : undefined, 'flex-shrink': value === item.value ? undefined : 0}"
                    :class="{'px-2 no-wrap overflow-ellipsis': value === item.value, [$style['darwin-border-button']]: hasDarwinBorder}"
                    :mode="mode && value === item.value ? mode : undefined"
                    :type="type && value === item.value ? type : undefined"
                    :square="value !== item.value"
                    @click="$emit('update:value', item.value)">
                {{value === item.value ? item.label : null}}
            </Button>
        </template>
    </Flex>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.darwin-border-button:last-child
    border-bottom-right-radius: size.$radius-size-very-large
</style>