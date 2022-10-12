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
