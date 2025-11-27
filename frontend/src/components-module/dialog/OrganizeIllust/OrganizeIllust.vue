<script setup lang="ts">
import { computed } from "vue"
import { AspectGrid, BottomLayout } from "@/components/layout"
import { Button, Block } from "@/components/universal"
import { ORGANIZE_MODE_TEXT } from "@/constants/enum"
import { OrganizeIllustProps, useOrganizeIllustContext } from "./context"
import ImageUnit from "./ImageUnit.vue"

const props = defineProps<{
    p: OrganizeIllustProps
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const imageIds = computed(() => props.p.images)

const onSucceed = () => {
    props.p.onSucceed?.()
    emit("close")
}

const { form, formAnyChanged, images, loading, data, reloadData, apply } = useOrganizeIllustContext(imageIds, onSucceed)

</script>

<template>
    <div :class="['flex', 'align-stretch', 'h-100', 'gap-1', $style.root]">
        <div class="flex-item w-100 h-100 flex column">
            <div class="mt-2 pl-1 flex jc-between flex-item no-grow-shrink">
                <p class="is-font-size-large">快捷整理</p>
                <p v-if="loading" class="pl-1">正在生成预览…</p>
                <p v-else class="pl-1">{{ images?.length }}个图像 / 生成{{ data?.filter(i => i.length > 1).length }}个集合</p>
            </div>
            <AspectGrid class="is-overflow-y-auto" :items="images" :column-num="8" :aspect="1" img-style="no-radius" v-slot="{ item }">
                <ImageUnit :item="item"/>
            </AspectGrid>
        </div>
        <BottomLayout :class="$style['action-content']">
            <p class="mt-2 pl-1 bold">整理选项</p>
            <Block v-for="item in ORGANIZE_MODE_TEXT" :key="item.mode" class="p-2 mt-1" :color="form.organizeMode === item.mode ? 'primary' : undefined" @click="form.organizeMode = item.mode">
                <p>{{item.title}}</p>
                <p class="secondary-text">{{item.text}}</p>
            </Block>
            <template #bottom>
                <Button class="w-100 mt-1" :mode="formAnyChanged ? 'light' : undefined" type="primary" icon="rotate" :disabled="!formAnyChanged" @click="reloadData">重新生成</Button>
                <Button class="w-100 mt-1" mode="filled" type="primary" icon="check" :disabled="loading" @click="apply">应用整理</Button>
            </template>
        </BottomLayout>
    </div>
</template>

<style module lang="sass">
.root
    height: 480px

.action-content
    width: 12rem
    height: 100%
    flex-shrink: 0
</style>