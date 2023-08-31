<script setup lang="ts">
import { computed } from "vue"
import { useToastManager } from "@/modules/toast"
import ToastItem from "./ToastItem.vue"

const { toasts } = useToastManager()

const items = computed(() => toasts.slice(0, 12))

const close = (index: number) => toasts.splice(index, 1)

</script>

<template>
    <transition-group tag="div"
                      :class="$style['root']"
                      :enter-from-class="$style['transition-enter-from']"
                      :leave-to-class="$style['transition-leave-to']"
                      :enter-active-class="$style['transition-enter-active']"
                      :leave-active-class="$style['transition-leave-active']"
                      :move-class="$style['transition-list-move']">
        <ToastItem v-for="(item, i) in items" :key="item.uniqueKey" :title="item.title" :type="item.type" :content="item.content" @close="close(i)"/>
    </transition-group>
</template>

<style module lang="sass">
.root
    z-index: 100
    position: fixed
    top: 0
    right: 0
    width: 35rem
    margin-top: 46px
    margin-right: 8px
    display: flex
    flex-direction: column
    align-items: flex-end
    justify-content: right
    pointer-events: none

.transition-enter-from
    transform: translateX(100%)
.transition-leave-to
    //通知关闭有两套动画。向右滑动时，使用slide-to-close动画。
    //这套动画会给ToastItem设置一个.slide-to-close的class，同时style填写一个translateX作为起始偏移。
    //由于组件已卸载，不能在这之后改变组件内部的style了，因此在leave-to的目标上添加!important标记，强制覆盖数值，以实现终点。
    &:global(.slide-to-close)
        transform: translateX(560px) !important
    &:not(:global(.slide-to-close))
        transform: translateY(-100%)
        opacity: 0
.transition-enter-active
    transition: transform 0.15s ease-out
.transition-leave-active
    position: absolute //需要将leave的element设置为absolute，以使其从文档流中抽出，从而使vue的list move class生效
    transition: transform 0.3s ease-in, opacity 0.3s ease-in
.transition-list-move
    transition: transform 0.3s ease
</style>
