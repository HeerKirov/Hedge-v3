<script setup lang="ts">
import { GridImages, Icon } from "@/components/universal"
import { BottomLayout } from "@/components/layout"
import { toRef } from "@/utils/reactivity"
import { useAssociateViewData } from "./context"

const props = defineProps<{
    id: number
}>()

const emit = defineEmits<{
    (e: "close"): void
    (e: "edit"): void
}>()

const { data, openAssociateInNewView } = useAssociateViewData(toRef(props, "id"), () => emit("close"))

</script>

<template>
    <BottomLayout>
        <p class="my-2 pl-1">
            <span class="is-font-size-large">关联组</span>
            <a class="float-right mr-2" @click="$emit('edit')"><Icon icon="edit"/>编辑</a>
        </p>
        <GridImages v-if="data !== null && data.length > 0" :column-num="7" :images="data.map(i => i.thumbnailFile)" clickable @click="(_, i) => openAssociateInNewView(i)"/>
        <div v-else-if="data !== null && data.length <= 0" class="has-text-centered secondary-text mt-2"><i>没有任何关联组项</i></div>
    </BottomLayout>
</template>
