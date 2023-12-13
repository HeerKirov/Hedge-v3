<script setup lang="ts">
import { Button } from "@/components/universal"
import { BottomLayout, AspectGrid } from "@/components/layout"
import { useAssets } from "@/functions/app"
import { CaseBookProps, CaseFolderProps, useAddIllustBookFolderContext } from "./context"

const props = defineProps<{
    p: CaseBookProps | CaseFolderProps
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const { assetsUrl } = useAssets()

const { chooseIgnore, chooseResolve, situations } = useAddIllustBookFolderContext(props.p, () => emit("close"))

</script>

<template>
    <BottomLayout>
        <p class="mt-2 pl-1 is-font-size-large">添加图像到{{p.type === "book" ? "画集" : "目录"}}</p>
        <p class="mb-2 pl-1">部分图像被重复添加了。请确认处理策略：</p>
        <AspectGrid class="px-1" :spacing="1" :column-num="8" img-style="no-radius" :items="situations" v-slot="{ item }">
            <img :src="assetsUrl(item.filePath.sample)" :alt="`situation-${item.id}`"/>
            <div v-if="item.ordinal !== null" :class="$style['ordinal-flag']">{{item.ordinal + 1}}</div>
        </AspectGrid>
        <template #bottom>
            <div class="mt-2">
                <span class="ml-2 is-line-height-std">移动选项将重复图像移动到新位置；忽略选项则将这些图像保留在原位置。</span>
                <Button class="float-right ml-1" mode="filled" type="primary" icon="check" @click="chooseIgnore">忽略</Button>
                <Button class="float-right" mode="filled" type="primary" icon="check" @click="chooseResolve">移动</Button>
            </div>
        </template>
    </BottomLayout>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
@import "../../../styles/base/color"

.ordinal-flag
    position: absolute
    right: 0.25rem
    bottom: 0.25rem
    line-height: 1.5em
    width: 1.5em
    text-align: center
    border-radius: $radius-size-round
    background-color: rgba(0, 0, 0, 0.65)
    color: $dark-mode-text-color
</style>
