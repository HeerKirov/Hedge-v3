<script setup lang="ts">
import { Button } from "@/components/universal"
import { AspectGrid, BottomLayout } from "@/components/layout"
import { useAssets } from "@/functions/app"
import { useQuickFindData } from "./context"

defineOptions({
    inheritAttrs: false
})

const props = defineProps<{
    illusts: number[]
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const { assetsUrl } = useAssets()

const { data, openInNewTab, openInNewWindow } = useQuickFindData(props.illusts, () => emit("close"))

</script>

<template>
    <BottomLayout>
        <p class="mt-2 pl-1 is-font-size-large">快速查找</p>
        <p class="mb-2 pl-1">{{ data?.succeed ? '查找已完成。' : '正在执行查找……'}}</p>
        <AspectGrid v-if="!!data" class="px-1" :spacing="1" :column-num="10" img-style="no-radius" :items="data.result" v-slot="{ item }">
            <img :src="assetsUrl(item.filePath.sample)" :alt="`situation-${item.id}`"/>
        </AspectGrid>
        <template #bottom>
            <div class="mt-2">
                <Button class="float-right ml-1" mode="filled" type="primary" icon="up-right-from-square" :disabled="!data?.succeed" @click="openInNewTab">在新标签页中打开</Button>
                <Button class="float-right ml-1" mode="filled" type="primary" icon="up-right-from-square" :disabled="!data?.succeed" @click="openInNewWindow">在新窗口中打开</Button>
            </div>
        </template>
    </BottomLayout>
</template>
