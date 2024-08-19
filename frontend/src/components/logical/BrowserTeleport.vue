<script setup lang="ts">
import { useCurrentTab } from "@/modules/browser"

defineProps<{
    to: "top-bar" | "side-bar"
}>()

const { activePage, activeTab } = useCurrentTab()!

</script>

<script lang="ts">
import { defineComponent } from "vue"

const WrappedSlot = defineComponent({
    setup(_, { slots }) {
        return () => slots?.default?.()
    },
})

</script>

<template>
    <Teleport v-if="activePage" :to="`#${to}`">
        <KeepAlive>
            <WrappedSlot v-if="activeTab">
                <slot/>
            </WrappedSlot>
        </KeepAlive>
    </Teleport>
</template>
