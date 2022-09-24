<script setup lang="ts">
import { ref, watch } from "vue"
import { Block } from "@/components/universal"
import { onOutsideClick } from "@/utils/sensors";

const props = defineProps<{
    visible?: boolean
}>()

const emit = defineEmits<{
    (e: "update:visible", v: boolean): void
    (e: "close"): void
}>()

const visible = ref(props.visible ?? false)

const click = () => {
    visible.value = !visible.value
    emit("update:visible", visible.value)
    if(!visible.value) emit("close")
}

watch(() => props.visible, v => visible.value = v ?? false)

const divRef = ref<HTMLElement>()

onOutsideClick(divRef, () => {
    visible.value = false
    emit("update:visible", false)
    emit("close")
})

</script>

<template>
    <div ref="divRef" :class="$style.root">
        <slot :visible="visible" :click="click"/>
        <Block v-if="visible" :class="$style.popup">
            <slot name="popup"/>
        </Block>
    </div>
</template>

<style module lang="sass">
@import "../../styles/base/size"

.root
    display: inline-block
    position: relative

.popup
    z-index: 1
    position: absolute
    bottom: 0
    left: 50%
    transform: translate(-50%, 100%)
</style>
