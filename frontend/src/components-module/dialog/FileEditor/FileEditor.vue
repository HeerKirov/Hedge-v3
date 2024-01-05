<script setup lang="ts">
import { Button, Icon } from "@/components/universal"
import { AspectGrid, BottomLayout } from "@/components/layout"
import { useAssets } from "@/functions/app"
import { FileEditorProps, useConvertFormat } from "./context"

const props = defineProps<{
    p: FileEditorProps
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const { assetsUrl } = useAssets()

const { state, illusts, submit } = useConvertFormat(props.p, () => emit("close"))

</script>

<template>
    <BottomLayout>
        <p class="mt-2 pl-1 is-font-size-large">图像格式转换</p>
        <p class="mb-2 pl-1">对选中的图像进行特定的格式转换。PNG图像将被转换为JPEG图像。这将在几乎不损失质量的情况下缩减容量大小。</p>
        <AspectGrid class="px-1" :spacing="1" :column-num="10" img-style="no-radius" :items="illusts" v-slot="{ item }">
            <img :src="assetsUrl(item.filePath.sample)" :alt="`situation-${item.id}`"/>
            <div v-if="item.state !== 'CHECK'" :class="$style.fetching">
                <div class="absolute center">
                    <Icon :class="{'has-text-success': item.state === 'COMPLETE'}" :spin="item.state === 'FETCHING'" :icon="item.state === 'FETCHING' ? 'circle-notch' : 'check'"/>
                </div>
            </div>
        </AspectGrid>
        <template #bottom>
            <div class="mt-2">
                <span class="ml-2 is-line-height-std">{{ state === 'LOADING' ? '正在加载图像列表……' : state === 'CHECK' ? `共有${illusts.length}项等待被转换。` : state === 'FETCHING' ? '正在处理图像……' : '图像处理已完成。'}}</span>
                <Button v-if="state === 'LOADING' || state === 'CHECK' || state === 'FETCHING'" class="float-right" mode="filled" type="primary" icon="check" :disabled="state === 'LOADING' || state === 'FETCHING' || illusts.length <= 0" @click="submit">转换</Button>
                <Button v-else-if="state === 'COMPLETE'" class="float-right" mode="filled" type="primary" icon="check" @click="submit">完成</Button>
            </div>
        </template>
    </BottomLayout>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
@import "../../../styles/base/color"

.fetching
    position: absolute
    left: 0
    top: 0
    bottom: 0
    right: 0
    background-color: rgba($lightgrey, 0.7)
    font-size: $font-size-1
</style>