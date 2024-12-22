<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue"

const props = defineProps<{
    src: string
    alt?: string
}>()

const actualSrc = ref()

const imgRef = useTemplateRef<HTMLImageElement>("img")

let unobserve = false

const observer = new IntersectionObserver((entries, observer) => {
    for(const entry of entries) {
        if (entry.isIntersecting) {
            actualSrc.value = props.src
            if(imgRef.value && unobserve) {
                observer.unobserve(imgRef.value)
                unobserve = false
            }

        }
    }
})

onMounted(() => {
    if(imgRef.value) observer.observe(imgRef.value)
})

onBeforeUnmount(() => {
    if(imgRef.value && unobserve) {
        observer.unobserve(imgRef.value)
        unobserve = false
    }
})

</script>

<template>
    <img ref="img" :src="actualSrc" :alt/>
</template>
