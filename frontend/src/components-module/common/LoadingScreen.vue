<script setup lang="ts">
import { ref, watch } from "vue"
import { Icon } from "@/components/universal"
import { sleep } from "@/utils/process"

const props = defineProps<{
    loading?: boolean
}>()

const loading = ref(false)

watch(() => props.loading, async (l, _, onInvalidate) => {
    if(l) {
        let validate = true
        onInvalidate(() => validate = false)
        await sleep(100)
        if(validate) loading.value = true
    }else{
        loading.value = false
    }
}, {immediate: true})

</script>

<template>
    <div v-if="loading" :class="$style.background">
        <div>
            <Icon icon="circle-notch" size="3x" spin/>
        </div>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/color"
@use "@/styles/base/size"

.background
    position: absolute
    top: 50%
    left: 50%
    width: 100px
    height: 100px
    text-align: center
    transform: translate(-50%, -50%)
    border-radius: size.$radius-size-very-large
    background-color: rgba(color.$light-mode-background-color, 75%)
    @media (prefers-color-scheme: dark)
        background-color: rgba(color.$dark-mode-background-color, 75%)

    > div
        position: absolute
        top: 50%
        left: 50%
        transform: translate(-50%, -50%)
</style>