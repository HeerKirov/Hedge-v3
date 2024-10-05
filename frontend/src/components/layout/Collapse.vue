<script setup lang="ts">
import { ref } from "vue"
import { Icon } from "@/components/universal"
import { useMemoryStorage } from "@/functions/app"

const props = defineProps<{
    title?: string
    memoryBucket?: string
}>()

const isOpen = props.memoryBucket ? useMemoryStorage<boolean>(props.memoryBucket, false) : ref(false)

</script>

<template>
    <div>
        <div class="flex no-wrap">
            <label v-if="title!!" class="label">{{title}}</label>
            <slot name="title"/>
            <a :class="$style.anchor" @click="isOpen = !isOpen"><Icon :icon="isOpen ? 'caret-down' : 'caret-right'"/></a>
        </div>
        <div v-if="isOpen"><slot/></div>
    </div>
</template>

<style module lang="sass">
.anchor
    width: 16px
</style>
